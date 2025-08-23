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
            io.to(deviceId).emit('new_log', { username, clientId: deviceId, log: entry });
        } else if (type === 'message') {
            clientSession.messages.push(entry);
            if(entry.type === 'user') clientSession.users.add(entry.from);
            io.to(deviceId).emit('new_message', { username, clientId: deviceId, message: entry });
            io.to(deviceId).emit('stats_update', {
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

    client.on('qr', (qr) => {
        addEntry('log', { message: 'A aguardar leitura do QR Code...' });
        clientSession.status = 'Aguardando QR';
        io.to(deviceId).emit('client_update', { username, id: deviceId, status: 'Aguardando QR' });
        qrcode.toDataURL(qr, { errorCorrectionLevel: 'H' }, (err, url) => {
            if (err) {
                console.error('Erro ao gerar QR Code:', err);
                io.to(deviceId).emit('status_change', { username, clientId: deviceId, status: 'Erro ao gerar QR' });
                return;
            }
            qrCodeData = url;
            io.to(deviceId).emit('qr_code', { username, clientId: deviceId, qrData: url });
            console.log
