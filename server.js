// server.js - Dashboard Chatbot Manager
// Versão final corrigida (LocalAuth, fila de clientes, QR Code, dashboard web)

const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
const STORAGE_FILE = path.join(__dirname, 'storage.json');

// Usuários permitidos (login no painel web)
const USERS = {
    "admin1": { password: "suporte@1" },
    "admin2": { password: "suporte@2" },
    "admin3": { password: "suporte@3" },
    "admin4": { password: "suporte@4" },
    "admin5": { password: "suporte@5" }
};

// Estado global
let liveClients = {};
let storage = { users: {} };
let clientCreationQueue = [];
let isCreatingClient = false;

// Salvar e carregar storage
const saveStorage = () => {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
    } catch (error) {
        console.error('Erro ao salvar storage:', error.message);
    }
};

const loadStorage = () => {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            storage = JSON.parse(fs.readFileSync(STORAGE_FILE));
        }
    } catch (error) {
        console.error('Erro ao carregar storage:', error.message);
        storage = { users: {} };
    }
};

// Limpeza de processos Chrome órfãos
const cleanupChromeProcesses = () => {
    try {
        execSync('pkill -f "chrome.*--user-data-dir.*wwebjs" 2>/dev/null || true', { timeout: 5000 });
        execSync('pkill -f "chromium.*--user-data-dir.*wwebjs" 2>/dev/null || true', { timeout: 5000 });
        console.log('🧹 Processos Chrome órfãos limpos');
    } catch (error) {
        // Ignorar erros
    }
};

// Detectar Chrome
const findChromePath = () => {
    console.log('🔍 Procurando Chrome/Chromium...');
    const possiblePaths = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
    ];
    for (const chromePath of possiblePaths) {
        if (fs.existsSync(chromePath)) {
            try {
                execSync(`timeout 10s ${chromePath} --headless --disable-gpu --no-sandbox --dump-dom https://www.google.com`, {
                    timeout: 15000, stdio: 'pipe'
                });
                console.log(`✅ Chrome funcionando: ${chromePath}`);
                return chromePath;
            } catch (error) { continue; }
        }
    }
    console.log('❌ Chrome/Chromium não encontrado!');
    return null;
};

// Configuração Puppeteer
const getPuppeteerConfig = (chromePath) => ({
    headless: true,
    executablePath: chromePath,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--disable-popup-blocking',
        '--disable-notifications',
        '--disable-component-update',
        '--disable-default-apps',
        '--mute-audio'
    ],
    timeout: 300000,
    defaultViewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true
});

// Fila de criação de clientes
const processClientQueue = async () => {
    if (isCreatingClient || clientCreationQueue.length === 0) return;
    isCreatingClient = true;
    const { username, deviceId } = clientCreationQueue.shift();
    try {
        await createClientInternal(username, deviceId);
    } catch (error) {
        console.error(`Erro ao criar cliente ${username}-${deviceId}:`, error.message);
    }
    isCreatingClient = false;
    if (clientCreationQueue.length > 0) {
        setTimeout(processClientQueue, 15000);
    }
};

const createClient = (username, deviceId) => {
    clientCreationQueue.push({ username, deviceId });
    processClientQueue();
};

// Criar cliente interno
const createClientInternal = async (username, deviceId) => {
    console.log(`🚀 Criando cliente "${deviceId}" para "${username}"`);
    cleanupChromeProcesses();

    const chromePath = findChromePath();
    if (!chromePath) {
        console.error('❌ Chrome/Chromium não encontrado!');
        return;
    }

    const clientId = `${username}-${deviceId}`;
    const client = new Client({
        authStrategy: new LocalAuth({ clientId }),
        puppeteer: getPuppeteerConfig(chromePath),
        qrMaxRetries: 20,
        takeoverOnConflict: true,
        restartOnAuthFail: true
    });

    if (!liveClients[username]) liveClients[username] = {};
    const clientSession = {
        instance: client,
        status: 'Inicializando',
        logs: [],
        messages: [],
        users: new Set(),
        clientId
    };
    liveClients[username][deviceId] = clientSession;

    const addLog = (msg) => {
        const entry = { message: msg, timestamp: new Date() };
        clientSession.logs.push(entry);
        if (clientSession.logs.length > 50) clientSession.logs.shift();
        io.emit('new_log', { username, clientId: deviceId, log: entry });
        console.log(`[${clientId}] ${msg}`);
    };

    // Eventos WhatsApp
    client.on('qr', async (qr) => {
        addLog('📱 QR Code recebido');
        const qrDataURL = await qrcode.toDataURL(qr);
        io.emit('qr_code', { username, clientId: deviceId, qrData: qrDataURL });
        clientSession.status = 'Aguardando QR';
        io.emit('client_update', { username, id: deviceId, status: 'Aguardando QR' });
    });

    client.on('ready', () => {
        addLog('🎉 Cliente conectado');
        clientSession.status = 'Conectado';
        io.emit('status_change', { username, clientId: deviceId, status: 'Conectado' });
    });

    client.on('disconnected', (reason) => {
        addLog(`🔌 Desconectado: ${reason}`);
        clientSession.status = 'Desconectado';
        io.emit('status_change', { username, clientId: deviceId, status: 'Desconectado' });
    });

    client.on('message', (msg) => {
        clientSession.messages.push({ from: msg.from, body: msg.body, timestamp: new Date() });
        io.emit('new_message', { username, clientId: deviceId, message: msg });
    });

    // Carregar lógica específica
    const logicPath = path.join(__dirname, 'logics', `${deviceId}.js`);
    if (fs.existsSync(logicPath)) {
        try {
            const attachLogic = require(logicPath);
            attachLogic(client, io, clientSession, addLog);
            addLog(`✅ Lógica ${deviceId} carregada`);
        } catch (err) {
            addLog(`❌ Erro lógica ${deviceId}: ${err.message}`);
        }
    }

    client.initialize().catch(err => addLog(`❌ Erro inicialização: ${err.message}`));
};

// ---------------- EXPRESS + SOCKET.IO -----------------
app.use(express.static(__dirname));

// Rota principal (painel)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Eventos socket.io
io.on('connection', (socket) => {
    console.log('🔗 Novo socket conectado');

    // Autenticação
    socket.on('authenticate', ({ username, password }) => {
        if (USERS[username] && USERS[username].password === password) {
            socket.emit('authenticated', { username });
            // Envia lista de clientes ativos
            const clients = Object.keys(liveClients[username] || {}).map(id => ({
                id, status: liveClients[username][id].status
            }));
            socket.emit('client_list', clients);
        } else {
            socket.emit('unauthorized');
        }
    });

    // Adicionar cliente
    socket.on('add_client', ({ username, deviceId }) => {
        createClient(username, deviceId);
        io.emit('client_added', { username, id: deviceId, status: 'Inicializando' });
    });

    // Remover cliente
    socket.on('remove_client', ({ username, deviceId }) => {
        if (liveClients[username] && liveClients[username][deviceId]) {
            liveClients[username][deviceId].instance.destroy();
            delete liveClients[username][deviceId];
            io.emit('client_removed', { username, id: deviceId });
        }
    });
});

// Inicialização
loadStorage();
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
