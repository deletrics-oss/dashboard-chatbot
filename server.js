// server.js - VERSÃO FINAL ULTRA-LEVE E CORRIGIDA
// Focada em servidores com poucos recursos

const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
const STORAGE_FILE = path.join(__dirname, 'storage.json');

const USERS = { "admin1": { password: "suporte@1" } };
let liveClients = {};
let storage = { users: {} };
let clientCreationQueue = [];
let isCreatingClient = false;

const log = (clientId, message) => console.log(`[${new Date().toLocaleString('pt-BR')}] [${clientId || 'System'}] ${message}`);
const saveStorage = () => fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
const loadStorage = () => {
    if (fs.existsSync(STORAGE_FILE)) storage = JSON.parse(fs.readFileSync(STORAGE_FILE));
};

const cleanupChromeProcesses = () => new Promise(resolve => {
    log(null, '🧹 Forçando limpeza de processos Chrome/Chromium...');
    exec('pkill -f "chrome.*wwebjs" || true', () => resolve());
});

const findChromePath = () => {
    const paths = ['/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser'];
    for (const p of paths) if (fs.existsSync(p)) return p;
    return null;
};

const restartClient = async (username, deviceId) => {
    const clientSession = liveClients[username]?.[deviceId];
    if (!clientSession) return;
    const clientId = clientSession.clientId;
    log(clientId, '🔄 REINICIALIZAÇÃO FORÇADA INICIADA...');
    clientSession.status = 'Reiniciando';
    io.emit('client_update', { username, id: deviceId, status: 'Reiniciando' });
    try { await clientSession.instance?.destroy(); } catch (e) {}
    if (liveClients[username]?.[deviceId]) delete liveClients[username][deviceId];
    await cleanupChromeProcesses();
    log(clientId, '⏳ Aguardando 20s para segurança...');
    setTimeout(() => {
        log(clientId, '➡️ Adicionando cliente à fila de recriação.');
        createClient(username, deviceId);
    }, 20000);
};

const createClientInternal = async (username, deviceId) => {
    const clientId = `${username}-${deviceId}`;
    log(clientId, `🚀 Tentando criar cliente...`);
    const chromePath = findChromePath();
    if (!chromePath) return;

    if (!liveClients[username]) liveClients[username] = {};
    const clientSession = { instance: null, status: 'A inicializar', logs: [], messages: [], users: new Set(), clientId };
    liveClients[username][deviceId] = clientSession;

    const addEntry = (type, data) => { /* ... (mesma função addEntry) ... */ };

    const client = new Client({
        authStrategy: new LocalAuth({ clientId }),
        puppeteer: {
            headless: true,
            executablePath: chromePath,
            args: [
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                '--disable-gpu', '--no-zygote', '--single-process', '--no-first-run',
                '--disable-extensions', '--disable-sync', '--disable-translate',
                '--disable-default-apps', '--disable-background-networking',
                '--mute-audio', '--disable-features=VizDisplayCompositor'
            ],
        },
    });
    clientSession.instance = client;

    const logicPath = path.join(__dirname, 'logics', `${deviceId}.js`);
    if (fs.existsSync(logicPath)) {
        try {
            const attachLogic = require(logicPath);
            attachLogic(client, io, clientSession, (type, data) => {
                const entry = { ...data, timestamp: new Date() };
                 if (type === 'log') {
                    clientSession.logs.push(entry);
                    if(clientSession.logs.length > 50) clientSession.logs.shift();
                    io.emit('new_log', { username, clientId: deviceId, log: entry });
                } else if (type === 'message') {
                    clientSession.messages.push(entry);
                    if(clientSession.messages.length > 30) clientSession.messages.shift();
                    io.emit('new_message', { username, clientId: deviceId, message: entry });
                }
            });
        } catch (e) {}
    }

    client.on('qr', async qr => {
        clientSession.status = 'Aguardando QR';
        io.emit('qr_code', { username, clientId: deviceId, qrData: await qrcode.toDataURL(qr) });
        io.emit('client_update', { username, id: deviceId, status: 'Aguardando QR' });
    });
    client.on('ready', () => {
        clientSession.status = 'Conectado';
        io.emit('client_update', { username, id: deviceId, status: 'Conectado' });
        io.emit('qr_code_clear', { username, clientId: deviceId });
    });
    client.on('disconnected', reason => restartClient(username, deviceId));
    client.on('auth_failure', () => restartClient(username, deviceId));
    client.on('error', () => restartClient(username, deviceId));

    try { await client.initialize(); } catch (err) { restartClient(username, deviceId); }
};

// O restante do código (io.on, app.use, startServer) permanece o mesmo
const createClient = (username, deviceId) => {
    if (!clientCreationQueue.some(c => c.deviceId === deviceId)) {
        clientCreationQueue.push({ username, deviceId });
        processClientQueue();
    }
};
const processClientQueue = async () => {
    if (isCreatingClient || clientCreationQueue.length === 0) return;
    isCreatingClient = true;
    const { username, deviceId } = clientCreationQueue.shift();
    await createClientInternal(username, deviceId);
    setTimeout(() => {
        isCreatingClient = false;
        processClientQueue();
    }, 30000);
};
io.on('connection', (socket) => {
    socket.on('authenticate', (credentials) => {
        if (USERS[credentials.username]?.password === credentials.password) {
            socket.username = credentials.username;
            socket.emit('authenticated', { username: socket.username });
            const userDevices = storage.users[socket.username]?.devices || [];
            socket.emit('client_list', userDevices.map(id => ({ id, status: liveClients[socket.username]?.[id]?.status || 'Desconectado' })));
        } else { socket.emit('unauthorized'); }
    });
    socket.on('request_device_data', (deviceId) => {
        if (!socket.username || !liveClients[socket.username]?.[deviceId]) return;
        const d = liveClients[socket.username][deviceId];
        socket.emit('device_data', { clientId: deviceId, logs: d.logs, recentMessages: d.messages });
    });
    socket.on('add_client', (id) => {
        if (!socket.username || !id) return;
        if (!storage.users[socket.username]) storage.users[socket.username] = { devices: [] };
        if (!storage.users[socket.username].devices.includes(id)) {
            storage.users[socket.username].devices.push(id);
            saveStorage();
        }
        createClient(socket.username, id);
        io.emit('client_added', { username: socket.username, id, status: 'Na Fila' });
    });
    socket.on('delete_client', (id) => {
        if (!socket.username || !storage.users[socket.username]) return;
        storage.users[socket.username].devices = storage.users[socket.username].devices.filter(d => d !== id);
        saveStorage();
        if (liveClients[socket.username] && liveClients[socket.username][id]) {
            liveClients[socket.username][id].instance.destroy();
            delete liveClients[socket.username][id];
        }
        io.emit('client_removed', { username: socket.username, id });
    });
    socket.on('reconnect_client', (id) => socket.username && id && restartClient(socket.username, id));
});
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
const startServer = async () => {
    await cleanupChromeProcesses();
    const chromePath = findChromePath();
    if (!chromePath) { process.exit(1); }
    server.listen(PORT, '0.0.0.0', () => {
        log(null, `🚀 Servidor rodando na porta ${PORT}`);
        loadStorage();
        (storage.users.admin1?.devices || []).forEach((deviceId, i) => {
            setTimeout(() => createClient('admin1', deviceId), 30000 * i);
        });
    });
};
startServer();
