// server.js - VERSÃO ULTRA ROBUSTA E CORRIGIDA
// Resolve: SingletonLock, Session closed, e gerenciamento de processos fantasmas

const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process'); // Usar 'exec' para não bloquear

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
const STORAGE_FILE = path.join(__dirname, 'storage.json');

const USERS = {
    "admin1": { password: "suporte@1" },
    "admin2": { password: "suporte@2" },
    "admin3": { password: "suporte@3" },
    "admin4": { password: "suporte@4" },
    "admin5": { password: "suporte@5" }
};

let liveClients = {};
let storage = { users: {} };
let clientCreationQueue = [];
let isCreatingClient = false;

// --- FUNÇÕES DE LOG E ARMAZENAMENTO (STORAGE) ---

const log = (clientId, message) => {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`\`\`\`\\[${timestamp}] [${clientId || 'System'}] ${message}\`\`\``);
};

const saveStorage = () => {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
    } catch (error) {
        log(null, `❌ Erro ao salvar storage: ${error.message}`);
    }
};

const loadStorage = () => {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE);
            storage = JSON.parse(data);
        }
    } catch (error) {
        log(null, `❌ Erro ao carregar storage: ${error.message}`);
        storage = { users: {} };
    }
};

// --- GERENCIAMENTO DE PROCESSOS DO CHROME ---

const cleanupChromeProcesses = () => {
    return new Promise((resolve) => {
        log(null, '🧹 Forçando a limpeza de processos Chrome/Chromium órfãos...');
        const commands = [
            'pkill -f "chrome.*--user-data-dir.*wwebjs" || true',
            'pkill -f "chromium.*--user-data-dir.*wwebjs" || true'
        ];
        exec(commands.join(' && '), (error, stdout, stderr) => {
            if (error) {
                log(null, `⚠️  Aviso na limpeza de processos: ${error.message}`);
            }
            log(null, '✅ Limpeza de processos concluída.');
            resolve();
        });
    });
};

const findChromePath = () => {
    const possiblePaths = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
    ];
    for (const chromePath of possiblePaths) {
        if (fs.existsSync(chromePath)) {
            log(null, `✅ Chrome encontrado em: ${chromePath}`);
            return chromePath;
        }
    }
    log(null, '❌ Nenhuma instalação do Chrome/Chromium foi encontrada!');
    return null;
};

// --- CRIAÇÃO E GERENCIAMENTO DE CLIENTES WHATSAPP ---

const createClient = async (username, deviceId) => {
    const clientId = `${username}-${deviceId}`;
    if (clientCreationQueue.some(item => item.clientId === clientId) || (liveClients?.[username]?.[deviceId])) {
        log(clientId, '⚠️  Tentativa de recriar cliente que já está na fila ou ativo. Ignorando.');
        return;
    }
    clientCreationQueue.push({ username, deviceId, clientId });
    processClientQueue();
};

const processClientQueue = async () => {
    if (isCreatingClient || clientCreationQueue.length === 0) return;
    isCreatingClient = true;

    const { username, deviceId } = clientCreationQueue.shift();
    await createClientInternal(username, deviceId);

    setTimeout(() => {
        isCreatingClient = false;
        processClientQueue();
    }, 20000); // Aumentado para 20s de intervalo seguro entre criações
};

const restartClient = async (username, deviceId) => {
    const clientSession = liveClients?.[username]?.[deviceId];
    if (!clientSession) return;

    const clientId = clientSession.clientId;
    log(clientId, '🔄 REINICIALIZAÇÃO FORÇADA INICIADA...');
    clientSession.status = 'Reiniciando';
    io.emit('client_update', { username, id: deviceId, status: 'Reiniciando' });

    // 1. Destruir instância atual
    try {
        if (clientSession.instance) {
            await clientSession.instance.destroy();
            log(clientId, '✅ Instância do cliente destruída.');
        }
    } catch (e) {
        log(clientId, `⚠️  Erro ao destruir instância (normal se já desconectado): ${e.message}`);
    }

    // 2. Limpar da memória
    if (liveClients?.[username]?.[deviceId]) {
        delete liveClients?.[username]?.[deviceId];
    }

    // 3. Limpeza FORÇADA de processos
    await cleanupChromeProcesses();

    // 4. Aguardar para garantir que o SO liberou os arquivos de lock
    log(clientId, '⏳ Aguardando 20 segundos para segurança...');
    setTimeout(() => {
        log(clientId, '➡️ Adicionando cliente à fila de recriação.');
        createClient(username, deviceId);
    }, 20000); // 20 segundos é um tempo seguro
};


const createClientInternal = async (username, deviceId) => {
    const clientId = `${username}-${deviceId}`;
    log(clientId, `🚀 Tentando criar cliente...`);

    const chromePath = findChromePath();
    if (!chromePath) {
        io.emit('client_update', { username, id: deviceId, status: 'Erro: Chrome não encontrado' });
        return;
    }

    if (!liveClients?.[username]) liveClients?.[username] = {};
    const clientSession = {
        instance: null, status: 'A inicializar', sessions: { userStates: {} },
        logs: [], messages: [], users: new Set(), clientId
    };
    liveClients?.[username][deviceId] = clientSession;

    const addEntry = (type, data) => {
        const entry = { ...data, timestamp: new Date() };
        if (type === 'log') {
            clientSession.logs.push(entry);
            if (clientSession.logs.length > 100) clientSession.logs.shift();
            log(clientId, entry.message);
            io.emit('new_log', { username, clientId: deviceId, log: entry });
        } else if (type === 'message') {
            clientSession.messages.push(entry);
            if (clientSession.messages.length > 50) clientSession.messages.shift();
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
            args: [
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
                '--single-process', '--disable-gpu'
            ],
        },
        qrMaxRetries: 10,
        authTimeoutMs: 120000, // 2 minutos
        restartOnAuthFail: true,
    });

    clientSession.instance = client;

    // Carregar Lógica Externa
    const logicPath = path.join(__dirname, 'logics', `${deviceId}.js`);
    if (fs.existsSync(logicPath)) {
        try {
            const attachLogic = require(logicPath);
            attachLogic(client, io, clientSession, addEntry);
            addEntry('log', { message: `✅ Lógica do chatbot "${deviceId}" carregada.` });
        } catch (error) {
            addEntry('log', { message: `❌ Erro crítico ao carregar lógica: ${error.message}` });
        }
    } else {
        addEntry('log', { message: `⚠️  Nenhuma lógica encontrada para "${deviceId}". Operando em modo de espelho.` });
        client.on('message', msg => { // Lógica padrão
             addEntry('message', { from: msg.from, body: msg.body, type: 'user'});
        });
    }

    client.on('qr', async (qr) => {
        clientSession.status = 'Aguardando QR';
        addEntry('log', { message: '📱 QR Code recebido. Enviar para o painel.' });
        const qrDataURL = await qrcode.toDataURL(qr);
        io.emit('qr_code', { username, clientId: deviceId, qrData: qrDataURL });
        io.emit('client_update', { username, id: deviceId, status: 'Aguardando QR' });
    });

    client.on('ready', () => {
        clientSession.status = 'Conectado';
        addEntry('log', { message: '🎉 CONECTADO COM SUCESSO!' });
        io.emit('status_change', { username, clientId: deviceId, status: 'Conectado' });
        io.emit('client_update', { username, id: deviceId, status: 'Conectado' });
        io.emit('qr_code_clear', { username, clientId: deviceId });
    });

    client.on('auth_failure', (msg) => {
        clientSession.status = 'Falha Autenticação';
        addEntry('log', { message: `❌ Falha na autenticação: ${msg}` });
        io.emit('client_update', { username, id: deviceId, status: 'Falha Autenticação' });
        restartClient(username, deviceId);
    });

    client.on('disconnected', (reason) => {
        clientSession.status = 'Desconectado';
        addEntry('log', { message: `🔌 Desconectado: ${reason}` });
        io.emit('status_change', { username, clientId: deviceId, status: 'Desconectado' });
        io.emit('client_update', { username, id: deviceId, status: 'Desconectado' });
        if(reason.includes('SIGINT')) return; // Não reiniciar se foi desligamento manual
        restartClient(username, deviceId);
    });

    client.on('error', (error) => {
        addEntry('log', { message: `❌ ERRO CRÍTICO: ${error.message}` });
        restartClient(username, deviceId);
    });

    try {
        addEntry('log', { message: 'Iniciando cliente...' });
        await client.initialize();
    } catch (err) {
        addEntry('log', { message: `❌ Erro fatal na inicialização: ${err.message}` });
        restartClient(username, deviceId);
    }
};

// --- SERVIDOR E SOCKET.IO ---

io.on('connection', (socket) => {
    socket.on('authenticate', (credentials) => {
        if (USERS?.[credentials.username]?.password === credentials.password) {
            socket.username = credentials.username;
            socket.emit('authenticated', { username: socket.username });
            const userDevices = storage.users?.[socket.username]?.devices || [];
            socket.emit('client_list', userDevices.map(id => ({
                id,
                status: liveClients?.[socket.username]?.[id]?.status || 'Desconectado'
            })));
        } else {
            socket.emit('unauthorized');
        }
    });
     socket.on('request_device_data', (deviceId) => {
        if (!socket.username || !liveClients?.[socket.username]?.[deviceId]) return;
        const deviceData = liveClients?.[socket.username][deviceId];
        const messagesToday = deviceData.messages.filter(m => m.type === 'user' && new Date(m.timestamp).toDateString() === new Date().toDateString()).length;
        socket.emit('device_data', {
            clientId: deviceId, logs: deviceData.logs, recentMessages: deviceData.messages,
            stats: { messagesToday, activeUsers: deviceData.users.size }
        });
    });
    socket.on('add_client', (id) => {
        if (!socket.username || !id) return;
        if (!storage.users?.[socket.username]) storage.users?.[socket.username] = { devices: [] };
        if (!storage.users?.[socket.username].devices.includes(id)) {
            storage.users?.[socket.username].devices.push(id);
            saveStorage();
        }
        createClient(socket.username, id);
        io.emit('client_added', { username: socket.username, id, status: 'A inicializar' });
    });
    socket.on('delete_client', (id) => {
        if (!socket.username || !storage.users?.[socket.username]) return;
        storage.users?.[socket.username].devices = storage.users?.[socket.username].devices.filter(d => d !== id);
        saveStorage();
        if (liveClients?.[socket.username]?.[id]) {
            try {
                liveClients?.[socket.username][id].instance.destroy();
            } catch (error) {}
            delete liveClients?.[socket.username]?.[id];
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

// --- INICIALIZAÇÃO DO SERVIDOR ---
const startServer = async () => {
    await cleanupChromeProcesses();
    const chromePath = findChromePath();
    if (!chromePath) {
        log(null, "❌ ERRO FATAL: Não foi possível iniciar o servidor sem o Chrome.");
        process.exit(1);
    }
    server.listen(PORT, '0.0.0.0', () => {
        log(null, `🚀 Servidor rodando na porta ${PORT}`);
        loadStorage();
        let deviceCount = 0;
        for (const username in storage.users) {
            for (const deviceId of storage.users?.[username]?.devices || []) {
                setTimeout(() => {
                    createClient(username, deviceId);
                }, 30000 * deviceCount); // 30s de delay entre cada cliente
                deviceCount++;
            }
        }
        if (deviceCount > 0) log(null, `📱 ${deviceCount} clientes agendados para iniciar.`);
    });
};

const shutdown = async () => {
    log(null, '🛑 Encerrando o servidor...');
    for (const username in liveClients) {
        for (const deviceId in liveClients?.[username]) {
            try {
                if (liveClients?.[username][deviceId]?.instance) {
                    await liveClients?.[username][deviceId].instance.destroy();
                }
            } catch (e) {}
        }
    }
    await cleanupChromeProcesses();
    server.close(() => {
        log(null, '✅ Servidor encerrado.');
        process.exit(0);
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
