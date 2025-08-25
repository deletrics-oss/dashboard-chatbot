// server.js - VERSÃO FINAL E COMPLETA
// Inclui: Login seguro com bcrypt, estabilidade de conexão e todas as funcionalidades do painel.

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
const STORAGE_FILE = path.join(__dirname, 'storage.json');

let liveClients = {};
let storage = { users: {} };

// --- FUNÇÕES DE LOG E ARMAZENAMENTO ---
const log = (clientId, message) => {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`[${timestamp}] [${clientId || 'System'}] ${message}`);
};

const saveStorage = () => {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
    } catch (error) {
        log(null, `❌ Erro ao salvar storage: ${error.message}`);
    }
};

const loadStorage = async () => {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            storage = JSON.parse(fs.readFileSync(STORAGE_FILE));
        } else {
            // Se não houver usuários, cria um admin padrão
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin', salt);
            storage = {
                users: {
                    'admin': {
                        password: hashedPassword,
                        devices: []
                    }
                }
            };
            saveStorage();
            log(null, "🔑 Nenhum usuário encontrado. Criado usuário padrão 'admin' com senha 'admin'.");
        }
    } catch (error) {
        log(null, `❌ Erro ao carregar storage: ${error.message}`);
    }
};

// --- GERENCIAMENTO DE PROCESSOS DO CHROME ---
const cleanupChromeProcesses = () => {
    return new Promise(resolve => {
        exec('pkill -f "chrome.*wwebjs" || true', () => resolve());
    });
};

const findChromePath = () => {
    const paths = ['/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser'];
    for (const p of paths) if (fs.existsSync(p)) return p;
    return null;
};

// --- LÓGICA DE CRIAÇÃO E REINÍCIO DE CLIENTES ---
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
    log(clientId, '⏳ Aguardando 15s para segurança...');
    setTimeout(() => createClient(username, deviceId), 15000);
};

const createClient = async (username, deviceId) => {
    const clientId = `${username}-${deviceId}`;
    log(clientId, `🚀 Criando cliente...`);
    
    const chromePath = findChromePath();
    if (!chromePath) {
        log(clientId, "❌ Chrome não encontrado!");
        return;
    }

    if (!liveClients[username]) liveClients[username] = {};
    const clientSession = { 
        instance: null, status: 'A inicializar', logs: [], messages: [], users: new Set(), clientId
    };
    liveClients[username][deviceId] = clientSession;

    const addEntry = (type, data) => {
        const entry = { ...data, timestamp: new Date() };
        if (type === 'log') {
            clientSession.logs.unshift(entry);
            if (clientSession.logs.length > 100) clientSession.logs.pop();
            io.emit('new_log', { username, clientId: deviceId, log: entry });
        } else if (type === 'message') {
            clientSession.messages.unshift(entry);
            if (clientSession.messages.length > 50) clientSession.messages.pop();
            if(entry.type === 'user') clientSession.users.add(entry.from);
            io.emit('new_message', { username, clientId: deviceId, message: entry });
            io.emit('stats_update', {
                username, clientId: deviceId,
                messagesToday: clientSession.messages.filter(m => m.type === 'user' && new Date(m.timestamp).toDateString() === new Date().toDateString()).length,
                activeUsers: clientSession.users.size
            });
        }
    };

    const client = new Client({
        authStrategy: new LocalAuth({ clientId }),
        puppeteer: {
            headless: true,
            executablePath: chromePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
    });
    clientSession.instance = client;

    // Carregar Lógica
    const logicPath = path.join(__dirname, 'logics', `${deviceId}.js`);
    if (fs.existsSync(logicPath)) {
        try {
            require(logicPath)(client, io, clientSession, addEntry);
            addEntry('log', { message: `✅ Lógica do chatbot "${deviceId}" carregada.` });
        } catch (e) {
            addEntry('log', { message: `❌ Erro ao carregar lógica: ${e.message}` });
        }
    }

    client.on('qr', async qr => {
        addEntry('log', { message: '📱 QR Code recebido!' });
        clientSession.status = 'Aguardando QR';
        io.emit('qr_code', { username, clientId: deviceId, qrData: await qrcode.toDataURL(qr) });
        io.emit('client_update', { username, id: deviceId, status: 'Aguardando QR' });
    });

    client.on('ready', () => {
        addEntry('log', { message: '🎉 CONECTADO COM SUCESSO!' });
        clientSession.status = 'Conectado';
        io.emit('client_update', { username, id: deviceId, status: 'Conectado' });
        io.emit('qr_code_clear', { username, clientId: deviceId });
    });

    client.on('disconnected', reason => restartClient(username, deviceId));
    client.on('auth_failure', () => restartClient(username, deviceId));

    try {
        await client.initialize();
    } catch (err) {
        addEntry('log', { message: `❌ Erro fatal na inicialização: ${err.message}` });
        restartClient(username, deviceId);
    }
};

// --- SOCKET.IO E ROTAS EXPRESS ---
io.on('connection', (socket) => {
    socket.on('authenticate', async (credentials) => {
        const user = storage.users[credentials.username];
        if (user && await bcrypt.compare(credentials.password, user.password)) {
            socket.username = credentials.username;
            socket.emit('authenticated', { username: socket.username });
            socket.emit('client_list', (user.devices || []).map(id => ({ 
                id, 
                status: liveClients[socket.username]?.[id]?.status || 'Desconectado' 
            })));
            log(socket.username, "✅ Login bem-sucedido.");
        } else {
            socket.emit('unauthorized');
            log(credentials.username, "❌ Tentativa de login falhou.");
        }
    });

    socket.on('request_device_data', (deviceId) => {
        if (!socket.username || !liveClients[socket.username]?.[deviceId]) return;
        const deviceData = liveClients[socket.username][deviceId];
        const messagesToday = deviceData.messages.filter(m => m.type === 'user' && new Date(m.timestamp).toDateString() === new Date().toDateString()).length;
        socket.emit('device_data', {
            clientId: deviceId,
            logs: deviceData.logs,
            recentMessages: deviceData.messages,
            stats: { messagesToday, activeUsers: deviceData.users.size }
        });
    });

    socket.on('add_client', (id) => {
        if (!socket.username || !id) return;
        const user = storage.users[socket.username];
        if (user && !user.devices.includes(id)) {
            user.devices.push(id);
            saveStorage();
        }
        createClient(socket.username, id);
        io.emit('client_added', { username: socket.username, id, status: 'A inicializar' });
    });

    socket.on('delete_client', (id) => {
        if (!socket.username || !id) return;
        const user = storage.users[socket.username];
        if (user) {
            user.devices = user.devices.filter(d => d !== id);
            saveStorage();
        }
        if (liveClients[socket.username]?.[id]) {
            liveClients[socket.username][id].instance.destroy();
            delete liveClients[socket.username][id];
        }
        io.emit('client_removed', { username: socket.username, id });
    });

    socket.on('reconnect_client', (id) => {
        if (!socket.username || !id) return;
        restartClient(socket.username, id);
    });
});

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// --- INICIALIZAÇÃO ---
const startServer = async () => {
    await loadStorage();
    await cleanupChromeProcesses();
    server.listen(PORT, '0.0.0.0', () => {
        log(null, `🚀 Servidor rodando na porta ${PORT}`);
        // Inicia clientes existentes
        for (const username in storage.users) {
            (storage.users[username].devices || []).forEach(deviceId => {
                createClient(username, deviceId);
            });
        }
    });
};

startServer();
