// server.js

// --- 1. SETUP INICIAL ---
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

// --- 2. AUTENTICAÇÃO E GESTÃO DE UTILIZADORES ---
const USERS = {
    "admin1": { password: "suporte@1" },
    "admin2": { password: "suporte@2" },
    "admin3": { password: "suporte@3" },
    "admin4": { password: "suporte@4" },
    "admin5": { password: "suporte@5" }
};

// --- 3. GESTÃO DE CLIENTES E PERSISTÊNCIA ---
let liveClients = {}; // Guarda as instâncias ativas
let storage = { users: {} }; // Guarda a configuração dos dispositivos

// Função para guardar o estado no ficheiro JSON
const saveStorage = () => {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
    } catch (error) {
        console.error('Falha ao guardar o estado:', error);
    }
};

// Função para carregar o estado do ficheiro JSON
const loadStorage = () => {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE);
            storage = JSON.parse(data);
            console.log('Estado carregado a partir de storage.json');
        } else {
            // Se o ficheiro não existir, cria um com a estrutura base
            saveStorage();
        }
    } catch (error) {
        console.error('Falha ao carregar o estado:', error);
    }
};

const createClient = (username, deviceId) => {
    console.log(`A criar dispositivo "${deviceId}" para o utilizador "${username}"`);
    
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: `${username}-${deviceId}` }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
    });

    // Inicializa a estrutura de armazenamento
    if (!liveClients[username]) liveClients[username] = {};
    liveClients[username][deviceId] = { instance: client, status: 'A inicializar', sessions: { userStates: {} } };

    // Lógica do Chatbot
    const logicPath = path.join(__dirname, 'logics', `${deviceId}.js`);
    if (fs.existsSync(logicPath)) {
        const attachLogic = require(logicPath);
        attachLogic(client, io, liveClients[username][deviceId].sessions);
    } else {
        console.warn(`AVISO: Ficheiro de lógica não encontrado para ${deviceId}.`);
        client.on('message', async (msg) => {
            if (msg.body.toLowerCase() === 'oi') {
                await client.sendMessage(msg.from, `Olá! O dispositivo ${deviceId} está online.`);
            }
        });
    }

    client.on('qr', async (qr) => {
        liveClients[username][deviceId].status = 'Aguardando QR';
        io.emit('qr_code', { username, clientId: deviceId, qrData: await qrcode.toDataURL(qr) });
        io.emit('client_update', { username, id: deviceId, status: 'Aguardando QR' });
    });

    client.on('ready', () => {
        liveClients[username][deviceId].status = 'Conectado';
        io.emit('status_change', { username, clientId: deviceId, status: 'Conectado' });
        io.emit('client_update', { username, id: deviceId, status: 'Conectado' });
    });

    client.on('disconnected', (reason) => {
        if (liveClients[username] && liveClients[username][deviceId]) {
            liveClients[username][deviceId].status = 'Desconectado';
            io.emit('status_change', { username, clientId: deviceId, status: 'Desconectado' });
            io.emit('client_update', { username, id: deviceId, status: 'Desconectado' });
            client.destroy();
        }
    });

    client.initialize().catch(err => console.error(`Erro ao inicializar ${deviceId}:`, err));
};

// --- 4. COMUNICAÇÃO COM O DASHBOARD ---
io.on('connection', (socket) => {
    socket.on('authenticate', (credentials) => {
        if (USERS[credentials.username] && USERS[credentials.username].password === credentials.password) {
            socket.username = credentials.username;
            socket.emit('authenticated', { username: socket.username });
            
            const userDevices = storage.users[socket.username]?.devices || [];
            socket.emit('client_list', userDevices.map(id => ({ id, status: liveClients[socket.username]?.[id]?.status || 'Desconectado' })));
        } else {
            socket.emit('unauthorized');
        }
    });

    socket.on('add_client', (id) => {
        if (!socket.username || !id) return;
        
        if (!storage.users[socket.username]) {
            storage.users[socket.username] = { devices: [] };
        }
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

// --- 5. SERVIDOR WEB E INICIALIZAÇÃO ---
app.use(express.static(__dirname)); 
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

server.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
    loadStorage();
    // Tenta reconectar todos os dispositivos guardados ao iniciar o servidor
    for (const username in storage.users) {
        for (const deviceId of storage.users[username].devices) {
            console.log(`A reiniciar dispositivo guardado: ${deviceId} para ${username}`);
            createClient(username, deviceId);
        }
    }
});
