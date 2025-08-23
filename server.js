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

// --- 2. AUTENTICAÇÃO E GESTÃO DE UTILIZADORES ---
const USERS = {
    "admin1": { password: "suporte@1" },
    "admin2": { password: "suporte@2" },
    "admin3": { password: "suporte@3" },
    "admin4": { password: "suporte@4" },
    "admin5": { password: "suporte@5" }
};

// --- 3. GERENCIADOR DE CLIENTES (AGORA SEPARADO POR UTILIZADOR) ---
const userClients = {}; // Ex: { "admin1": { "dispositivo-A": { instance, status } } }

const createClient = (username, deviceId) => {
    console.log(`A criar dispositivo "${deviceId}" para o utilizador "${username}"`);
    
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: `${username}-${deviceId}` }), // Garante que as sessões são únicas
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
    });

    // Inicializa a estrutura para este utilizador se não existir
    if (!userClients[username]) {
        userClients[username] = {};
    }
    // Inicializa a sessão de conversa
    if (!userClients[username][deviceId]) {
         userClients[username][deviceId] = {};
    }
    userClients[username][deviceId].sessions = { userStates: {} };


    // --- LÓGICA DE CARREGAMENTO DINÂMICO DO CHATBOT ---
    const logicPath = path.join(__dirname, 'logics', `${deviceId}.js`);
    if (fs.existsSync(logicPath)) {
        console.log(`A carregar lógica de ${logicPath} para ${deviceId}`);
        const attachLogic = require(logicPath);
        attachLogic(client, io, userClients[username][deviceId].sessions);
    } else {
        console.warn(`AVISO: Ficheiro de lógica não encontrado para ${deviceId}. A usar lógica padrão.`);
        client.on('message', async (msg) => {
            if (msg.body.toLowerCase() === 'oi') {
                await client.sendMessage(msg.from, `Olá! O dispositivo ${deviceId} está online.`);
            }
        });
    }

    client.on('qr', async (qr) => {
        userClients[username][deviceId].status = 'Aguardando QR';
        io.emit('qr_code', { username, clientId: deviceId, qrData: await qrcode.toDataURL(qr) });
        io.emit('client_update', { username, id: deviceId, status: 'Aguardando QR' });
    });

    client.on('ready', () => {
        userClients[username][deviceId].status = 'Conectado';
        io.emit('status_change', { username, clientId: deviceId, status: 'Conectado' });
        io.emit('client_update', { username, id: deviceId, status: 'Conectado' });
    });

    client.on('disconnected', (reason) => {
        if (userClients[username] && userClients[username][deviceId]) {
            userClients[username][deviceId].status = 'Desconectado';
            io.emit('status_change', { username, clientId: deviceId, status: 'Desconectado' });
            io.emit('client_update', { username, id: deviceId, status: 'Desconectado' });
            client.destroy();
            delete userClients[username][deviceId];
        }
    });

    userClients[username][deviceId] = { instance: client, status: 'A inicializar' };
    client.initialize().catch(err => console.error(`Erro ao inicializar ${deviceId}:`, err));
};

// --- 4. COMUNICAÇÃO COM O DASHBOARD ---
io.on('connection', (socket) => {
    socket.on('authenticate', (credentials) => {
        if (USERS[credentials.username] && USERS[credentials.username].password === credentials.password) {
            socket.username = credentials.username; // Guarda o utilizador na sessão do socket
            socket.emit('authenticated', { username: socket.username });
            
            // Envia apenas a lista de dispositivos deste utilizador
            const userDevices = userClients[socket.username] || {};
            socket.emit('client_list', Object.keys(userDevices).map(id => ({ id, status: userDevices[id].status })));
        } else {
            socket.emit('unauthorized');
        }
    });

    // As ações agora usam o `socket.username` para garantir que só afetam os dispositivos do utilizador logado
    socket.on('add_client', (id) => {
        if (!socket.username || !id) return;
        createClient(socket.username, id);
        io.emit('client_added', { username: socket.username, id, status: 'A inicializar' });
    });

    socket.on('delete_client', (id) => {
        if (!socket.username || !userClients[socket.username] || !userClients[socket.username][id]) return;
        userClients[socket.username][id].instance.destroy();
        delete userClients[socket.username][id];
        io.emit('client_removed', { username: socket.username, id });
    });
});

// --- 5. SERVIDOR WEB ---
app.use(express.static(__dirname)); 
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
server.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
