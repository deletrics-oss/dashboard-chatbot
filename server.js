const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { storage } = require('./storage'); // Ajuste o caminho se necessário

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const whatsappClient = new Client({});

let qrCodeData = null;

whatsappClient.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Erro ao gerar QR Code:', err);
            storage.createSystemLog({ type: 'error', message: 'Falha na geração de QR Code' });
            return;
        }
        qrCodeData = url;
        io.emit('qrCode', qrCodeData); // Envia QR para o frontend
        storage.createSystemLog({ type: 'info', message: 'QR Code gerado, aguardando scan' });
    });
});

whatsappClient.on('ready', () => {
    console.log('WhatsApp Bot conectado!');
    io.emit('status', 'Conectado');
    storage.createSystemLog({ type: 'success', message: 'Bot conectado com sucesso' });
});

whatsappClient.on('message', async (msg) => {
    if (msg.body === 'ping') {
        msg.reply('pong');
    }
    await storage.createMessage({
        phoneNumber: msg.from,
        content: msg.body,
        isFromBot: false
    });
    await storage.updateChatbotUser(msg.from, { currentState: 'ativo' });
    io.emit('newMessage', { from: msg.from, content: msg.body });
});

whatsappClient.on('disconnected', (reason) => {
    console.log('Desconectado:', reason);
    io.emit('status', 'Desconectado');
    qrCodeData = null;
    storage.createSystemLog({ type: 'warning', message: `Desconectado: ${reason}` });
});

whatsappClient.initialize();

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/logs', async (req, res) => {
    const logs = await storage.getSystemLogs(10);
    res.json(logs);
});

app.get('/active-users', async (req, res) => {
    const count = await storage.getActiveUsersCount();
    res.json({ count });
});

io.on('connection', (socket) => {
    socket.emit('qrCode', qrCodeData);
    socket.emit('status', whatsappClient.info ? 'Conectado' : 'Aguardando QR');
});

server.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});
