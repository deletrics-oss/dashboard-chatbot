// server.js - VERSÃO FINAL CORRIGIDA
// Resolve: LocalAuth + userDataDir conflict + Session closed + QR Code

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

// LIMPEZA DE PROCESSOS ÓRFÃOS
const cleanupChromeProcesses = () => {
    try {
        execSync('pkill -f "chrome.*--user-data-dir.*wwebjs" 2>/dev/null || true', { timeout: 5000 });
        execSync('pkill -f "chromium.*--user-data-dir.*wwebjs" 2>/dev/null || true', { timeout: 5000 });
        console.log('🧹 Processos Chrome órfãos limpos');
    } catch (error) {
        // Ignorar erros de limpeza
    }
};

// DETECTAR CHROME
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
                    timeout: 15000, 
                    stdio: 'pipe' 
                });
                console.log(`✅ Chrome funcionando: ${chromePath}`);
                return chromePath;
            } catch (error) {
                continue;
            }
        }
    }

    console.log('❌ Chrome/Chromium não encontrado!');
    return null;
};

// CONFIGURAÇÃO PUPPETEER COMPATÍVEL COM LOCALAUTH
const getPuppeteerConfig = (chromePath) => {
    return {
        headless: true,
        executablePath: chromePath,
        // NÃO USAR userDataDir - LocalAuth gerencia isso automaticamente
        args: [
            // Argumentos essenciais para resolver Session closed
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-gpu-sandbox',
            '--disable-software-rasterizer',
            
            // Argumentos para estabilidade
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-sync',
            '--disable-translate',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            
            // Argumentos específicos para Session closed
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-field-trial-config',
            '--disable-back-forward-cache',
            '--disable-ipc-flooding-protection',
            '--disable-blink-features=AutomationControlled',
            '--disable-client-side-phishing-detection',
            '--disable-component-extensions-with-background-pages',
            '--disable-domain-reliability',
            '--disable-features=TranslateUI,BlinkGenPropertyTrees',
            '--disable-component-update',
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
            '--disable-features=BackForwardCache',
            
            // Argumentos de performance
            '--memory-pressure-off',
            '--max_old_space_size=2048',
            '--disable-background-networking',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-pings',
            '--password-store=basic',
            '--use-mock-keychain',
            '--disable-fre',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--force-color-profile=srgb',
            '--run-all-compositor-stages-before-draw',
            '--disable-threaded-animation',
            '--disable-threaded-scrolling',
            '--disable-checker-imaging',
            '--disable-new-content-rendering-timeout',
            '--disable-image-animation-resync',
            '--disable-partial-raster',
            '--disable-skia-runtime-opts',
            '--disable-system-font-check',
            '--autoplay-policy=user-gesture-required',
            '--virtual-time-budget=5000',
            '--disable-background-mode',
            '--disable-popup-blocking',
            '--disable-session-crashed-bubble',
            '--disable-infobars',
            '--disable-restore-session-state',
            '--enable-features=NetworkService,NetworkServiceLogging'
        ],
        timeout: 300000, // 5 minutos
        ignoreDefaultArgs: false,
        defaultViewport: {
            width: 1366,
            height: 768
        },
        slowMo: 100,
        devtools: false,
        ignoreHTTPSErrors: true,
        waitForInitialPage: true,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
    };
};

// FILA DE CRIAÇÃO DE CLIENTES
const processClientQueue = async () => {
    if (isCreatingClient || clientCreationQueue.length === 0) {
        return;
    }
    
    isCreatingClient = true;
    const { username, deviceId } = clientCreationQueue.shift();
    
    try {
        await createClientInternal(username, deviceId);
        setTimeout(() => {
            isCreatingClient = false;
            processClientQueue();
        }, 15000); // 15 segundos entre clientes
    } catch (error) {
        console.error(`Erro ao criar cliente ${username}-${deviceId}:`, error.message);
        isCreatingClient = false;
        processClientQueue();
    }
};

const createClient = (username, deviceId) => {
    clientCreationQueue.push({ username, deviceId });
    processClientQueue();
};

const createClientInternal = async (username, deviceId) => {
    console.log(`🚀 Criando cliente "${deviceId}" para "${username}"`);
    
    cleanupChromeProcesses();
    
    const chromePath = findChromePath();
    if (!chromePath) {
        console.error('❌ Chrome/Chromium não encontrado!');
        return;
    }

    const clientId = `${username}-${deviceId}`;
    
    // CONFIGURAÇÃO CORRETA: LocalAuth SEM userDataDir customizado
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: clientId }), // LocalAuth gerencia o diretório automaticamente
        puppeteer: getPuppeteerConfig(chromePath), // SEM userDataDir
        qrMaxRetries: 20,
        authTimeoutMs: 300000,
        takeoverOnConflict: true,
        takeoverTimeoutMs: 300000,
        restartOnAuthFail: true,
        markOnlineOnConnect: true,
        qrRefreshS: 30
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
        maxQrRetries: 20,
        initRetries: 0,
        maxInitRetries: 10,
        lastQrTime: null,
        connectionAttempts: 0,
        maxConnectionAttempts: 20,
        clientId: clientId
    };
    
    liveClients[username][deviceId] = clientSession;

    const addEntry = (type, data) => {
        const entry = { ...data, timestamp: new Date() };
        if (type === 'log') {
            clientSession.logs.push(entry);
            if (clientSession.logs.length > 50) {
                clientSession.logs = clientSession.logs.slice(-50);
            }
            console.log(`[${clientId}] ${entry.message}`);
            io.emit('new_log', { username, clientId: deviceId, log: entry });
        } else if (type === 'message') {
            clientSession.messages.push(entry);
            if (clientSession.messages.length > 30) {
                clientSession.messages = clientSession.messages.slice(-30);
            }
            if(entry.type === 'user') clientSession.users.add(entry.from);
            io.emit('new_message', { username, clientId: deviceId, message: entry });
            io.emit('stats_update', {
                username,
                clientId: deviceId,
                messagesToday: clientSession.messages.filter(m => 
                    m.type === 'user' && 
                    new Date(m.timestamp).toDateString() === new Date().toDateString()
                ).length,
                activeUsers: clientSession.users.size
            });
        }
    };

    // Carregar lógica específica
    const logicPath = path.join(__dirname, 'logics', `${deviceId}.js`);
    if (fs.existsSync(logicPath)) {
        try {
            const attachLogic = require(logicPath);
            attachLogic(client, io, clientSession, addEntry);
            addEntry('log', { message: `✅ Lógica ${deviceId} carregada.` });
        } catch (error) {
            addEntry('log', { message: `❌ Erro na lógica ${deviceId}: ${error.message}` });
        }
    } else {
        addEntry('log', { message: `⚠️  Lógica não encontrada para ${deviceId}.` });
    }

    // EVENTO QR CODE OTIMIZADO
    client.on('qr', async (qr) => {
        try {
            addEntry('log', { message: '📱 QR Code recebido! Gerando imagem...' });
            clientSession.status = 'Aguardando QR';
            clientSession.lastQrTime = new Date();
            
            const qrDataURL = await qrcode.toDataURL(qr, {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                quality: 0.95,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' },
                width: 300
            });
            
            addEntry('log', { message: '✅ QR Code pronto! Escaneie com WhatsApp no celular.' });
            
            io.emit('qr_code', { 
                username, 
                clientId: deviceId, 
                qrData: qrDataURL,
                timestamp: new Date().toISOString()
            });
            
            io.emit('client_update', { username, id: deviceId, status: 'Aguardando QR' });
            
        } catch (error) {
            addEntry('log', { message: `❌ Erro no QR: ${error.message}` });
            clientSession.qrRetries++;
            
            if (clientSession.qrRetries < clientSession.maxQrRetries) {
                const delay = Math.min(30000 * clientSession.qrRetries, 180000);
                addEntry('log', { message: `🔄 Nova tentativa QR em ${delay/1000}s...` });
                setTimeout(() => {
                    if (liveClients[username]?.[deviceId]) {
                        restartClient(username, deviceId);
                    }
                }, delay);
            } else {
                addEntry('log', { message: '❌ Máximo de tentativas QR atingido.' });
                clientSession.status = 'Erro QR';
                io.emit('client_update', { username, id: deviceId, status: 'Erro QR' });
            }
        }
    });

    // EVENTOS OTIMIZADOS
    client.on('ready', () => {
        addEntry('log', { message: '🎉 WhatsApp conectado com sucesso!' });
        clientSession.status = 'Conectado';
        clientSession.qrRetries = 0;
        clientSession.initRetries = 0;
        clientSession.connectionAttempts = 0;
        io.emit('status_change', { username, clientId: deviceId, status: 'Conectado' });
        io.emit('client_update', { username, id: deviceId, status: 'Conectado' });
        io.emit('qr_code_clear', { username, clientId: deviceId });
    });

    client.on('authenticated', () => {
        addEntry('log', { message: '🔐 Autenticação bem-sucedida.' });
        clientSession.status = 'Autenticado';
    });

    client.on('auth_failure', (msg) => {
        addEntry('log', { message: `❌ Falha autenticação: ${msg}` });
        clientSession.status = 'Falha Autenticação';
        io.emit('client_update', { username, id: deviceId, status: 'Falha Autenticação' });
        
        setTimeout(() => {
            if (liveClients[username]?.[deviceId]) {
                restartClient(username, deviceId);
            }
        }, 60000);
    });

    client.on('disconnected', (reason) => {
        addEntry('log', { message: `🔌 Desconectado: ${reason}` });
        if (liveClients[username]?.[deviceId]) {
            clientSession.status = 'Desconectado';
            io.emit('status_change', { username, clientId: deviceId, status: 'Desconectado' });
            io.emit('client_update', { username, id: deviceId, status: 'Desconectado' });
        }
    });

    client.on('error', (error) => {
        addEntry('log', { message: `❌ Erro: ${error.message}` });
        console.error(`[${clientId}] ERRO:`, error);
        
        if (error.message.includes('Session closed') || 
            error.message.includes('Protocol error') ||
            error.message.includes('Target closed') ||
            error.message.includes('Connection closed')) {
            
            clientSession.initRetries++;
            if (clientSession.initRetries < clientSession.maxInitRetries) {
                const delay = Math.min(45000 * clientSession.initRetries, 300000);
                addEntry('log', { message: `🔄 Recuperação em ${delay/1000}s (${clientSession.initRetries}/${clientSession.maxInitRetries})...` });
                setTimeout(() => {
                    if (liveClients[username]?.[deviceId]) {
                        restartClient(username, deviceId);
                    }
                }, delay);
            } else {
                addEntry('log', { message: '❌ Máximo de tentativas atingido.' });
                clientSession.status = 'Erro Crítico';
                io.emit('client_update', { username, id: deviceId, status: 'Erro Crítico' });
            }
        }
    });

    // FUNÇÃO PARA REINICIAR CLIENTE
    const restartClient = async (username, deviceId) => {
        try {
            addEntry('log', { message: '🔄 Reiniciando cliente...' });
            
            if (liveClients[username]?.[deviceId]?.instance) {
                try {
                    await liveClients[username][deviceId].instance.destroy();
                } catch (destroyError) {
                    console.error('Erro ao destruir cliente:', destroyError.message);
                }
            }
            
            cleanupChromeProcesses();
            
            setTimeout(() => {
                if (liveClients[username]?.[deviceId]) {
                    createClient(username, deviceId);
                }
            }, 20000); // 20 segundos
        } catch (error) {
            addEntry('log', { message: `❌ Erro ao reiniciar: ${error.message}` });
        }
    };

    // INICIALIZAÇÃO
    const initializeClient = () => {
        addEntry('log', { message: '🚀 Iniciando WhatsApp Web.js...' });
        addEntry('log', { message: `🌐 Chrome: ${chromePath}` });
        
        client.initialize().catch(err => {
            addEntry('log', { message: `❌ Erro inicialização: ${err.message}` });
            console.error(`[${clientId}] Erro:`, err);
            
            clientSession.initRetries++;
            if (clientSession.initRetries < clientSession.maxInitRetries) {
                const delay = Math.min(60000 * clientSession.initRetries, 600000);
                addEntry('log', { message: `🔄 Nova tentativa em ${delay/1000}s...` });
                setTimeout(() => {
                    if (liveClients[username]?.[deviceId]) {
                        initializeClient();
                    }
                }, delay);
            } else {
                clientSession.status = 'Erro Inicialização';
                io.emit('client_update', { username, id: deviceId, status: 'Erro Inicialização' });
            }
        });
    };

    initializeClient();
};

// EVENTOS SOCKET.IO (mantidos iguais)
io.on('connection', (socket) => {
    console.log('🔌 Nova conexão:', socket.id);

    socket.on('authenticate', (credentials) => {
        if (USERS[credentials.username]?.password === credentials.password) {
            socket.username = credentials.username;
            socket.emit('authenticated', { username: socket.username });
            const userDevices = storage.users[socket.username]?.devices || [];
            socket.emit('client_list', userDevices.map(id => ({ 
                id, 
                status: liveClients[socket.username]?.[id]?.status || 'Desconectado' 
            })));
            console.log(`✅ Login: ${socket.username}`);
        } else {
            socket.emit('unauthorized');
            console.log('❌ Login inválido:', credentials.username);
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
            logs: deviceData.logs.slice(-30),
            recentMessages: deviceData.messages.slice(-15),
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
        console.log(`➕ Dispositivo: ${socket.username}-${id}`);
    });
    
    socket.on('delete_client', (id) => {
        if (!socket.username || !storage.users[socket.username]) return;

        storage.users[socket.username].devices = storage.users[socket.username].devices.filter(d => d !== id);
        saveStorage();

        if (liveClients[socket.username] && liveClients[socket.username][id]) {
            try {
                liveClients[socket.username][id].instance.destroy();
            } catch (error) {
                console.error('Erro ao destruir:', error.message);
            }
            delete liveClients[socket.username][id];
        }
        io.emit('client_removed', { username: socket.username, id });
        console.log(`➖ Removido: ${socket.username}-${id}`);
    });

    socket.on('reconnect_client', (id) => {
        if (!socket.username || !id) return;
        console.log(`🔄 Reconectando: ${socket.username}-${id}`);
        
        if (liveClients[socket.username] && liveClients[socket.username][id]) {
            try {
                liveClients[socket.username][id].instance.destroy();
            } catch (error) {
                console.error('Erro ao destruir para reconexão:', error.message);
            }
            delete liveClients[socket.username][id];
        }
        
        setTimeout(() => {
            createClient(socket.username, id);
        }, 10000);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Desconectado:', socket.id);
    });
});

// ROTAS
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/health', (req, res) => {
    const chromePath = findChromePath();
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        clients: Object.keys(liveClients).length,
        chromePath: chromePath || 'NOT_FOUND',
        queueLength: clientCreationQueue.length,
        isCreatingClient: isCreatingClient
    });
});

// VERIFICAÇÃO INICIAL
console.log('🔍 Verificação inicial...');
const chromePath = findChromePath();
if (!chromePath) {
    console.error('❌ Chrome não encontrado!');
    process.exit(1);
}

cleanupChromeProcesses();
console.log('✅ Sistema verificado!');

// INICIALIZAÇÃO
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Dashboard: http://localhost:${PORT}`);
    console.log(`🌐 Chrome: ${chromePath}`);
    console.log('==========================================');
    
    loadStorage();
    let deviceCount = 0;
    for (const username in storage.users) {
        for (const deviceId of storage.users[username].devices) {
            console.log(`🔄 Agendando cliente: ${username}-${deviceId}`);
            setTimeout(() => {
                createClient(username, deviceId);
            }, 45000 * deviceCount); // 45s entre cada cliente
            deviceCount++;
        }
    }
    
    if (deviceCount > 0) {
        console.log(`📱 ${deviceCount} clientes serão criados com delay de 45s`);
    }
});

// TRATAMENTO DE SINAIS
process.on('SIGINT', () => {
    console.log('🛑 Encerrando...');
    cleanupChromeProcesses();
    
    for (const username in liveClients) {
        for (const deviceId in liveClients[username]) {
            try {
                if (liveClients[username][deviceId].instance) {
                    liveClients[username][deviceId].instance.destroy();
                }
            } catch (error) {
                console.error(`Erro ao destruir ${username}-${deviceId}:`, error.message);
            }
        }
    }
    
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
});

