// server.js

const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
const STORAGE_FILE = path.join(__dirname, 'storage.json');

const USERS = {
    "admin1": { password: "suporte@1" }, "admin2": { password: "suporte@2" },
    "admin3": { password: "suporte@3" }, "admin4": { password: "suporte@4" },
    "admin5": { password: "suporte@5" }
};

let liveClients = {};
let storage = { users: {} };

const saveStorage = () => fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
const loadStorage = () => {
    if (fs.existsSync(STORAGE_FILE)) {
        storage = JSON.parse(fs.readFileSync(STORAGE_FILE));
    }
};

const createClient = (username, deviceId) => {
    console.log(`A criar dispositivo "${deviceId}" para "${username}"`);
    
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: `${username}-${deviceId}` }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
    });

    if (!liveClients[username]) liveClients[username] = {};
    const clientSession = { 
        instance: client, 
        status: 'A inicializar', 
        sessions: { userStates: {} }, 
        messages: [], 
        logs: [],
        users: new Set()
    };
    liveClients[username][deviceId] = clientSession;

    const addEntry = (type, data) => {
        const entry = { ...data, timestamp: new Date() };
        if (type === 'log') {
            clientSession.logs.push(entry);
            io.emit('new_log', { username, clientId: deviceId, log: entry });
        } else if (type === 'message') {
            clientSession.messages.push(entry);
            if(entry.type === 'user') clientSession.users.add(entry.from);
            io.emit('new_message', { username, clientId: deviceId, message: entry });
            io.emit('stats_update', {
                username,
                clientId: deviceId,
                messagesToday: clientSession.messages.filter(m => m.type === 'user' && new Date(m.timestamp).toDateString() === new Date().toDateString()).length,
                activeUsers: clientSession.users.size
            });
        }
    };

    const logicPath = path.join(__dirname, 'logics', `${deviceId}.js`);
    if (fs.existsSync(logicPath)) {
        const attachLogic = require(logicPath);
        attachLogic(client, io, clientSession, addEntry);
    } else {
        addEntry('log', { message: `AVISO: Ficheiro de lógica não encontrado para ${deviceId}.` });
    }

    client.on('qr', async (qr) => {
        addEntry('log', { message: 'A aguardar leitura do QR Code...' });
        clientSession.status = 'Aguardando QR';
        io.emit('qr_code', { username, clientId: deviceId, qrData: await qrcode.toDataURL(qr) });
        io.emit('client_update', { username, id: deviceId, status: 'Aguardando QR' });
    });

    client.on('ready', () => {
        addEntry('log', { message: 'Dispositivo conectado com sucesso.' });
        clientSession.status = 'Conectado';
        io.emit('status_change', { username, clientId: deviceId, status: 'Conectado' });
        io.emit('client_update', { username, id: deviceId, status: 'Conectado' });
    });

    client.on('disconnected', (reason) => {
        addEntry('log', { message: `Dispositivo desconectado: ${reason}` });
        if (liveClients[username]?.[deviceId]) {
            clientSession.status = 'Desconectado';
            io.emit('status_change', { username, clientId: deviceId, status: 'Desconectado' });
            io.emit('client_update', { username, id: deviceId, status: 'Desconectado' });
            client.destroy();
        }
    });

    client.initialize().catch(err => addEntry('log', { message: `Erro ao inicializar: ${err.message}` }));
};

io.on('connection', (socket) => {
    socket.on('authenticate', (credentials) => {
        if (USERS[credentials.username]?.password === credentials.password) {
            socket.username = credentials.username;
            socket.emit('authenticated', { username: socket.username });
            const userDevices = storage.users[socket.username]?.devices || [];
            socket.emit('client_list', userDevices.map(id => ({ id, status: liveClients[socket.username]?.[id]?.status || 'Desconectado' })));
        } else {
            socket.emit('unauthorized');
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
        if (!storage.users[socket.username]) storage.users[socket.username] = { devices: [] };
        if (!storage.users[socket.username].devices.includes(id)) {
            storage.users[socket.username].devices.push(id);
            saveStorage();
        }
        createClient(socket.username, id);
        io.emit('client_added', { username: socket.username, id, status: 'A inicializar' });
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

     socket.on('reconnect_client', (id) => {
        if (!socket.username || !id) return;
        if (liveClients[socket.username] && liveClients[socket.username][id]) {
            liveClients[socket.username][id].instance.initialize();
        } else {
            createClient(socket.username, id);
        }
    });
});

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
server.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
    loadStorage();
    for (const username in storage.users) {
        for (const deviceId of storage.users[username].devices) {
            createClient(username, deviceId);
        }
    }
});
