// server.js - VERSÃO FINAL ULTRA-ROBUSTA

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

// FUNÇÃO PARA DETECTAR CHROME/CHROMIUM DO SISTEMA
const findChromePath = () => {
    const possiblePaths = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        '/usr/bin/chrome',
        '/opt/google/chrome/chrome'
    ];

    for (const chromePath of possiblePaths) {
        if (fs.existsSync(chromePath)) {
            console.log(`✅ Chrome/Chromium encontrado em: ${chromePath}`);
            return chromePath;
        }
    }

    // Tenta encontrar usando which
    try {
        const chromePath = execSync('which google-chrome-stable || which google-chrome || which chromium-browser || which chromium', { encoding: 'utf8' }).trim();
        if (chromePath) {
            console.log(`✅ Chrome/Chromium encontrado via which: ${chromePath}`);
            return chromePath;
        }
    } catch (error) {
        console.log('⚠️  Comando which falhou:', error.message);
    }

    console.log('❌ Chrome/Chromium não encontrado no sistema!');
    return null;
};

const createClient = (username, deviceId) => {
    console.log(`A criar dispositivo "${deviceId}" para "${username}"`);
    
    // Detecta o caminho do Chrome/Chromium
    const chromePath = findChromePath();
    
    if (!chromePath) {
        console.error('❌ ERRO CRÍTICO: Chrome/Chromium não encontrado!');
        return;
    }

    // CONFIGURAÇÃO ULTRA-ROBUSTA PARA RESOLVER "Session closed"
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: `${username}-${deviceId}` }),
        puppeteer: {
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
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-images',
                '--disable-javascript',
                '--disable-default-apps',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-field-trial-config',
                '--disable-back-forward-cache',
                '--disable-ipc-flooding-protection',
                '--memory-pressure-off',
                '--max_old_space_size=4096',
                '--disable-software-rasterizer',
                '--disable-background-networking',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-default-browser-check',
                '--no-pings',
                '--password-store=basic',
                '--use-mock-keychain',
                '--disable-fre',
                '--disable-hang-monitor',
                '--disable-prompt-on-repost',
                '--disable-domain-reliability',
                '--disable-component-extensions-with-background-pages',
                '--disable-blink-features=AutomationControlled',
                '--disable-client-side-phishing-detection',
                '--disable-sync',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--enable-features=NetworkService,NetworkServiceLogging',
                '--force-color-profile=srgb',
                '--disable-features=VizDisplayCompositor',
                '--run-all-compositor-stages-before-draw',
                '--disable-threaded-animation',
                '--disable-threaded-scrolling',
                '--disable-checker-imaging',
                '--disable-new-content-rendering-timeout',
                '--disable-image-animation-resync',
                '--disable-partial-raster',
                '--disable-skia-runtime-opts',
                '--disable-system-font-check',
                '--disable-features=AudioServiceOutOfProcess',
                '--autoplay-policy=user-gesture-required',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                '--disable-component-update',
                '--disable-domain-reliability',
                '--disable-features=AudioServiceOutOfProcess,VizDisplayCompositor,VizHitTestSurfaceLayer',
                '--disable-print-preview',
                '--disable-speech-api',
                '--disable-file-system',
                '--disable-presentation-api',
                '--disable-permissions-api',
                '--disable-new-zip-unpacker',
                '--disable-media-session-api',
                '--no-service-autorun',
                '--disable-notifications',
                '--disable-desktop-notifications',
                '--disable-extensions-file-access-check',
                '--disable-extensions-http-throttling',
                '--aggressive-cache-discard',
                '--disable-back-forward-cache',
                '--disable-backgrounding-occluded-windows',
                '--disable-features=BackForwardCache'
            ],
            timeout: 120000, // 2 minutos
            ignoreDefaultArgs: false,
            defaultViewport: {
                width: 1366,
                height: 768
            },
            slowMo: 100, // Adiciona delay entre ações
            devtools: false,
            ignoreHTTPSErrors: true,
            waitForInitialPage: true,
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false
        },
        // Configurações adicionais do cliente
        qrMaxRetries: 5,
        authTimeoutMs: 120000, // 2 minutos
        takeoverOnConflict: true,
        takeoverTimeoutMs: 120000,
        restartOnAuthFail: true,
        markOnlineOnConnect: true,
        qrRefreshS: 20 // Refresh QR a cada 20 segundos
    });

    if (!liveClients[username]) liveClients[username] = {};
    const clientSession = { 
        instance: client, 
        status: 'A inicializar', 
        sessions: { userStates: {} }, 
        messages: [], 
        logs: [],
        users: new Set(),
        qrRetries: 0,
        maxQrRetries: 5,
        initRetries: 0,
        maxInitRetries: 3
    };
    liveClients[username][deviceId] = clientSession;

    const addEntry = (type, data) => {
        const entry = { ...data, timestamp: new Date() };
        if (type === 'log') {
            clientSession.logs.push(entry);
            console.log(`[${username}-${deviceId}] ${entry.message}`);
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

    // Carrega a lógica específica do dispositivo
    const logicPath = path.join(__dirname, 'logics', `${deviceId}.js`);
    if (fs.existsSync(logicPath)) {
        try {
            const attachLogic = require(logicPath);
            attachLogic(client, io, clientSession, addEntry);
            addEntry('log', { message: `Lógica ${deviceId} carregada com sucesso.` });
        } catch (error) {
            addEntry('log', { message: `ERRO ao carregar lógica ${deviceId}: ${error.message}` });
        }
    } else {
        addEntry('log', { message: `AVISO: Ficheiro de lógica não encontrado para ${deviceId}.` });
    }

    // EVENTO QR CODE ULTRA-ROBUSTO
    client.on('qr', async (qr) => {
        try {
            addEntry('log', { message: 'QR Code recebido. A processar...' });
            clientSession.status = 'Aguardando QR';
            
            // Gera o QR code com configurações otimizadas
            const qrDataURL = await qrcode.toDataURL(qr, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                width: 256
            });
            
            addEntry('log', { message: 'QR Code gerado com sucesso. Aguardando leitura...' });
            
            // Emite o QR code para o frontend
            io.emit('qr_code', { 
                username, 
                clientId: deviceId, 
                qrData: qrDataURL,
                timestamp: new Date().toISOString()
            });
            
            io.emit('client_update', { username, id: deviceId, status: 'Aguardando QR' });
            
            // Reset do contador de tentativas quando um novo QR é gerado
            clientSession.qrRetries = 0;
            
        } catch (error) {
            addEntry('log', { message: `ERRO ao gerar QR Code: ${error.message}` });
            clientSession.qrRetries++;
            
            if (clientSession.qrRetries < clientSession.maxQrRetries) {
                addEntry('log', { message: `Tentativa ${clientSession.qrRetries}/${clientSession.maxQrRetries} de gerar QR Code...` });
                setTimeout(() => {
                    if (liveClients[username]?.[deviceId]) {
                        addEntry('log', { message: 'Reiniciando cliente para nova tentativa...' });
                        client.initialize();
                    }
                }, 10000); // 10 segundos de delay
            } else {
                addEntry('log', { message: 'Máximo de tentativas de QR Code atingido. Reinicie manualmente.' });
                clientSession.status = 'Erro QR';
                io.emit('client_update', { username, id: deviceId, status: 'Erro QR' });
            }
        }
    });

    // EVENTO READY MELHORADO
    client.on('ready', () => {
        addEntry('log', { message: 'Dispositivo conectado com sucesso!' });
        clientSession.status = 'Conectado';
        clientSession.qrRetries = 0;
        clientSession.initRetries = 0;
        io.emit('status_change', { username, clientId: deviceId, status: 'Conectado' });
        io.emit('client_update', { username, id: deviceId, status: 'Conectado' });
        io.emit('qr_code_clear', { username, clientId: deviceId });
    });

    // EVENTO AUTHENTICATED
    client.on('authenticated', () => {
        addEntry('log', { message: 'Autenticação realizada com sucesso.' });
    });

    // EVENTO AUTH_FAILURE MELHORADO
    client.on('auth_failure', (msg) => {
        addEntry('log', { message: `Falha na autenticação: ${msg}` });
        clientSession.status = 'Falha Autenticação';
        io.emit('client_update', { username, id: deviceId, status: 'Falha Autenticação' });
    });

    // EVENTO DISCONNECTED MELHORADO
    client.on('disconnected', (reason) => {
        addEntry('log', { message: `Dispositivo desconectado: ${reason}` });
        if (liveClients[username]?.[deviceId]) {
            clientSession.status = 'Desconectado';
            io.emit('status_change', { username, clientId: deviceId, status: 'Desconectado' });
            io.emit('client_update', { username, id: deviceId, status: 'Desconectado' });
        }
    });

    // EVENTO DE ERRO GERAL COM RETRY
    client.on('error', (error) => {
        addEntry('log', { message: `ERRO no cliente: ${error.message}` });
        console.error(`[${username}-${deviceId}] ERRO:`, error);
        
        // Se for erro de sessão fechada, tenta reinicializar
        if (error.message.includes('Session closed') || error.message.includes('Protocol error')) {
            clientSession.initRetries++;
            if (clientSession.initRetries < clientSession.maxInitRetries) {
                addEntry('log', { message: `Tentativa ${clientSession.initRetries}/${clientSession.maxInitRetries} de reinicialização...` });
                setTimeout(() => {
                    if (liveClients[username]?.[deviceId]) {
                        addEntry('log', { message: 'Reiniciando cliente após erro de sessão...' });
                        client.initialize();
                    }
                }, 15000); // 15 segundos de delay
            } else {
                addEntry('log', { message: 'Máximo de tentativas de reinicialização atingido.' });
                clientSession.status = 'Erro Crítico';
                io.emit('client_update', { username, id: deviceId, status: 'Erro Crítico' });
            }
        }
    });

    // INICIALIZAÇÃO COM TRATAMENTO DE ERRO ROBUSTO
    const initializeClient = () => {
        addEntry('log', { message: 'Iniciando cliente WhatsApp...' });
        client.initialize().catch(err => {
            addEntry('log', { message: `Erro ao inicializar cliente: ${err.message}` });
            console.error(`[${username}-${deviceId}] Erro na inicialização:`, err);
            
            clientSession.initRetries++;
            if (clientSession.initRetries < clientSession.maxInitRetries) {
                addEntry('log', { message: `Tentativa ${clientSession.initRetries}/${clientSession.maxInitRetries} de inicialização...` });
                setTimeout(() => {
                    if (liveClients[username]?.[deviceId]) {
                        initializeClient();
                    }
                }, 20000); // 20 segundos de delay
            } else {
                clientSession.status = 'Erro Inicialização';
                io.emit('client_update', { username, id: deviceId, status: 'Erro Inicialização' });
            }
        });
    };

    // Inicia o cliente
    initializeClient();
};

// EVENTOS SOCKET.IO
io.on('connection', (socket) => {
    console.log('Nova conexão Socket.IO:', socket.id);

    socket.on('authenticate', (credentials) => {
        if (USERS[credentials.username]?.password === credentials.password) {
            socket.username = credentials.username;
            socket.emit('authenticated', { username: socket.username });
            const userDevices = storage.users[socket.username]?.devices || [];
            socket.emit('client_list', userDevices.map(id => ({ 
                id, 
                status: liveClients[socket.username]?.[id]?.status || 'Desconectado' 
            })));
            console.log(`Usuário autenticado: ${socket.username}`);
        } else {
            socket.emit('unauthorized');
            console.log('Tentativa de login inválida:', credentials.username);
        }
    });

    socket.on('request_device_data', (deviceId) => {
        if (!socket.username || !liveClients[socket.username]?.[deviceId]) return;
        
        const deviceData = liveClients[socket.username][deviceId];
        const messagesToday = deviceData.messages.filter(m => 
            m.type === 'user' && 
            new Date(m.timestamp).toDateString() === new Date().toDateString()
        ).length;
        
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
        console.log(`Dispositivo adicionado: ${socket.username}-${id}`);
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
        console.log(`Dispositivo removido: ${socket.username}-${id}`);
    });

    socket.on('reconnect_client', (id) => {
        if (!socket.username || !id) return;
        console.log(`Reconectando dispositivo: ${socket.username}-${id}`);
        
        if (liveClients[socket.username] && liveClients[socket.username][id]) {
            // Destrói a instância atual antes de recriar
            liveClients[socket.username][id].instance.destroy();
            delete liveClients[socket.username][id];
        }
        
        // Aguarda um pouco antes de recriar
        setTimeout(() => {
            createClient(socket.username, id);
        }, 5000);
    });

    socket.on('disconnect', () => {
        console.log('Conexão Socket.IO desconectada:', socket.id);
    });
});

// MIDDLEWARE E ROTAS
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// HEALTH CHECK ENDPOINT
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        clients: Object.keys(liveClients).length,
        chromePath: findChromePath()
    });
});

// VERIFICAÇÃO INICIAL DO SISTEMA
console.log('🔍 Verificando dependências do sistema...');
const chromePath = findChromePath();
if (!chromePath) {
    console.error('❌ ERRO CRÍTICO: Chrome/Chromium não encontrado!');
    console.error('📋 Execute: sudo apt install -y google-chrome-stable');
    process.exit(1);
}

// INICIALIZAÇÃO DO SERVIDOR
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor a correr na porta ${PORT}`);
    console.log(`📱 Dashboard disponível em: http://localhost:${PORT}`);
    console.log(`🌐 Chrome/Chromium: ${chromePath}`);
    
    // Carrega storage e recria clientes existentes
    loadStorage();
    for (const username in storage.users) {
        for (const deviceId of storage.users[username].devices) {
            console.log(`Recriando cliente: ${username}-${deviceId}`);
            setTimeout(() => {
                createClient(username, deviceId);
            }, 5000 * Object.keys(storage.users).indexOf(username)); // Delay escalonado
        }
    }
});

// TRATAMENTO DE SINAIS DE SISTEMA
process.on('SIGINT', () => {
    console.log('🛑 Encerrando servidor...');
    
    // Destrói todos os clientes ativos
    for (const username in liveClients) {
        for (const deviceId in liveClients[username]) {
            if (liveClients[username][deviceId].instance) {
                liveClients[username][deviceId].instance.destroy();
            }
        }
    }
    
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
});

