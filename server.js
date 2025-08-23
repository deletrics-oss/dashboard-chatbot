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

// --- 2. AUTENTICAÇÃO SIMPLES ---
const USERS = {
    "admin": "admin" 
};

// --- 3. GERENCIADOR DE CLIENTES E SESSÕES ---
const clients = {}; 
const clientSessions = {};

// Função para criar e inicializar um novo cliente WhatsApp
const createClient = (id) => {
    console.log(`A criar dispositivo: ${id}`);
    
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: id }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
    });

    clientSessions[id] = { userStates: {} };

    // --- LÓGICA DE CARREGAMENTO DINÂMICO DO CHATBOT ---
    const logicPath = path.join(__dirname, 'logics', `${id}.js`);
    if (fs.existsSync(logicPath)) {
        console.log(`A carregar lógica de ${logicPath}`);
        try {
            const attachLogic = require(logicPath);
            attachLogic(client, io, clientSessions[id]);
        } catch (error) {
            console.error(`Erro ao carregar a lógica para ${id}:`, error);
        }
    } else {
        console.warn(`AVISO: Ficheiro de lógica não encontrado para ${id}. A usar lógica padrão.`);
        // Lógica padrão se o ficheiro do cliente não existir
        client.on('message', async (msg) => {
            io.emit('new_message', { clientId: id, from: msg.from.replace('@c.us',''), body: msg.body, timestamp: new Date().toLocaleTimeString(), type: 'user' });
            if (msg.body.toLowerCase() === 'oi') {
                const response = `Olá! O dispositivo ${id} está online, mas sem lógica de chatbot configurada.`;
                await client.sendMessage(msg.from, response);
                io.emit('new_message', { clientId: id, from: 'Bot', body: response, timestamp: new Date().toLocaleTimeString(), type: 'bot' });
            }
        });
    }
    // --- FIM DA LÓGICA DE CARREGAMENTO ---

    client.on('qr', async (qr) => {
        console.log(`QR recebido para ${id}`);
        const qrImageUrl = await qrcode.toDataURL(qr);
        clients[id].status = 'Aguardando QR';
        io.emit('qr_code', { clientId: id, qrData: qrImageUrl });
        io.emit('client_update', { id, status: 'Aguardando QR' });
    });

    client.on('ready', () => {
        console.log(`Dispositivo ${id} está pronto!`);
        clients[id].status = 'Conectado';
        io.emit('status_change', { clientId: id, status: 'Conectado', message: 'Dispositivo conectado com sucesso.' });
        io.emit('client_update', { id, status: 'Conectado' });
    });

    client.on('disconnected', (reason) => {
        console.log(`Dispositivo ${id} foi desconectado: ${reason}`);
        if (clients[id]) {
            clients[id].status = 'Desconectado';
            io.emit('status_change', { clientId: id, status: 'Desconectado', message: 'Sessão encerrada.' });
            io.emit('client_update', { id, status: 'Desconectado' });
            const sessionPath = path.join(__dirname, '.wwebjs_auth', `session-${id}`);
            if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
            client.destroy();
            delete clients[id];
            delete clientSessions[id];
        }
    });
    
    clients[id] = { instance: client, status: 'A inicializar' };
    client.initialize().catch(err => console.error(`Erro ao inicializar ${id}:`, err));
};

// --- 4. COMUNICAÇÃO COM O DASHBOARD (Socket.IO) ---
io.on('connection', (socket) => {
    console.log('Dashboard conectado via Socket.IO.');
    
    socket.on('authenticate', (credentials) => {
        if (USERS[credentials.username] === credentials.password) {
            socket.emit('authenticated');
            socket.emit('client_list', Object.keys(clients).map(id => ({ id, status: clients[id].status })));
        } else {
            socket.emit('unauthorized');
        }
    });

    socket.on('add_client', (id) => {
        if (!id || clients[id]) return;
        // Importante: o nome do ficheiro de lógica deve ser igual ao ID do dispositivo.
        // Ex: ID "fight-arcade" -> ficheiro "logics/fight-arcade.js"
        createClient(id);
        io.emit('client_added', { id, status: 'A inicializar' });
    });

    socket.on('reconnect_client', (id) => {
        if (!id) return;
        if (clients[id]) {
            clients[id].instance.initialize().catch(err => console.error(`Erro ao reinicializar ${id}:`, err));
        } else {
            createClient(id);
            io.emit('client_added', { id, status: 'A inicializar' });
        }
    });
    
    socket.on('delete_client', (id) => {
        if (clients[id]) {
            clients[id].instance.destroy();
            delete clients[id];
            delete clientSessions[id];
            const sessionPath = path.join(__dirname, '.wwebjs_auth', `session-${id}`);
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
            io.emit('client_removed', id);
            console.log(`Dispositivo ${id} removido.`);
        }
    });
});

// --- 5. SERVIDOR WEB ---
app.use(express.static(__dirname)); 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});
