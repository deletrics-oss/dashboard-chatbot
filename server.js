const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { storage } = require('./storage'); // Certifique-se de que storage.js existe

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const whatsappClient = new Client({ puppeteer: { headless: true } }); // Força headless para evitar erros

let qrCodeData = null;

whatsappClient.on('qr', (qr) => {
    qrcode.toDataURL(qr, { errorCorrectionLevel: 'H' }, (err, url) => {
        if (err) {
            console.error('Erro ao gerar QR Code:', err);
            storage.createSystemLog({ type: 'error', message: 'Falha na geração de QR Code: ' + err.message });
            io.emit('status', 'Erro ao gerar QR');
            return;
        }
        qrCodeData = url;
        io.emit('qrCode', qrCodeData);
        storage.createSystemLog({ type: 'info', message: 'QR Code gerado, aguardando scan' });
    });
});

whatsappClient.on('ready', () => {
    console.log('WhatsApp Bot conectado!');
    io.emit('status', 'Conectado');
    storage.createSystemLog({ type: 'success', message: 'Bot conectado' });
});

whatsappClient.on('message', async (msg) => {
    console.log('Mensagem recebida:', msg.body);
    if (msg.body === 'ping') msg.reply('pong');
    await storage.createMessage({ phoneNumber: msg.from, content: msg.body, isFromBot: false });
    await storage.updateChatbotUser(msg.from, { currentState: 'ativo' });
    io.emit('newMessage', { from: msg.from, content: msg.body });
});

whatsappClient.on('disconnected', (reason) => {
    console.log('Desconectado:', reason);
    io.emit('status', 'Desconectado');
    qrCodeData = null;
    storage.createSystemLog({ type: 'warning', message: `Desconectado: ${reason}` });
});

whatsappClient.initialize().catch(err => {
    console.error('Erro ao inicializar WhatsApp:', err);
    storage.createSystemLog({ type: 'error', message: 'Falha ao inicializar WhatsApp: ' + err.message });
});

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/logs', async (req, res) => {
    try {
        const logs = await storage.getSystemLogs(10);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar logs' });
    }
});

app.get('/active-users', async (req, res) => {
    try {
        const count = await storage.getActiveUsersCount();
        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao contar usuários ativos' });
    }
});

io.on('connection', (socket) => {
    socket.emit('qrCode', qrCodeData);
    socket.emit('status', whatsappClient.info ? 'Conectado' : 'Aguardando QR');
});

server.listen(3000, () => {
    console.log('Servidor rodando em http://162.245.191.70:3000');
}).on('error', (err) => {
    console.error('Erro ao iniciar servidor:', err);
});
