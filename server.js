// server.js - VERSÃO ULTRA-ROBUSTA DEFINITIVA
// Corrige: Session closed, libgbm.so.1, QR Code, formulário de login

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

// FUNÇÃO ULTRA-ROBUSTA PARA DETECTAR CHROME/CHROMIUM
const findChromePath = () => {
    console.log('🔍 Procurando Chrome/Chromium no sistema...');
    
    const possiblePaths = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        '/usr/bin/chrome',
        '/opt/google/chrome/chrome',
        '/opt/google/chrome/google-chrome',
        '/usr/local/bin/google-chrome-stable',
        '/usr/local/bin/google-chrome',
        '/usr/local/bin/chromium-browser',
        '/usr/local/bin/chromium'
    ];

    // Verificar caminhos diretos
    for (const chromePath of possiblePaths) {
        if (fs.existsSync(chromePath)) {
            try {
                // Testar se o executável funciona
                execSync(`${chromePath} --version`, { timeout: 5000, stdio: 'pipe' });
                console.log(`✅ Chrome/Chromium encontrado e testado: ${chromePath}`);
                return chromePath;
            } catch (error) {
                console.log(`⚠️  Chrome encontrado mas com problemas: ${chromePath}`);
                continue;
            }
        }
    }

    // Tentar encontrar usando which
    const whichCommands = [
        'which google-chrome-stable',
        'which google-chrome',
        'which chromium-browser',
        'which chromium'
    ];

    for (const cmd of whichCommands) {
        try {
            const chromePath = execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
            if (chromePath && fs.existsSync(chromePath)) {
                // Testar se funciona
                execSync(`${chromePath} --version`, { timeout: 5000, stdio: 'pipe' });
                console.log(`✅ Chrome/Chromium encontrado via which: ${chromePath}`);
                return chromePath;
            }
        } catch (error) {
            continue;
        }
    }

    console.log('❌ ERRO CRÍTICO: Chrome/Chromium não encontrado!');
    console.log('📋 Instale com: sudo apt install -y google-chrome-stable');
    return null;
};

// VERIFICAÇÃO DE DEPENDÊNCIAS CRÍTICAS
const checkCriticalDependencies = () => {
    console.log('🔍 Verificando dependências críticas...');
    
    // Verificar libgbm.so.1
    try {
        const libgbmCheck = execSync('ldconfig -p | grep libgbm.so.1', { encoding: 'utf8', timeout: 5000 });
        if (libgbmCheck.trim()) {
            console.log('✅ libgbm.so.1 encontrada');
        } else {
            throw new Error('libgbm.so.1 não encontrada');
        }
    } catch (error) {
        console.log('❌ ERRO: libgbm.so.1 não encontrada!');
        console.log('📋 Instale com: sudo apt install -y libgbm1 libgbm-dev');
        return false;
    }

    // Verificar outras dependências importantes
    const requiredLibs = [
        'libnss3',
        'libatk',
        'libx11',
        'libxss1'
    ];

    for (const lib of requiredLibs) {
        try {
            execSync(`dpkg -l | grep ${lib}`, { timeout: 3000, stdio: 'pipe' });
            console.log(`✅ ${lib} encontrada`);
        } catch (error) {
            console.log(`⚠️  ${lib} pode estar faltando`);
        }
    }

    return true;
};

// CONFIGURAÇÃO ULTRA-ROBUSTA DO PUPPETEER
const getPuppeteerConfig = (chromePath) => {
    return {
        headless: true,
        executablePath: chromePath,
        args: [
            // Argumentos básicos de segurança
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            
            // Argumentos para resolver "Session closed"
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images',
            '--disable-default-apps',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-field-trial-config',
            '--disable-back-forward-cache',
            '--disable-ipc-flooding-protection',
            
            // Argumentos de performance
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
            '--disable-features=TranslateUI',
            '--enable-features=NetworkService,NetworkServiceLogging',
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
            '--disable-features=AudioServiceOutOfProcess',
            '--autoplay-policy=user-gesture-required',
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
            
            // Argumentos específicos para servidores
            '--virtual-time-budget=5000',
            '--disable-background-mode',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-sync',
            '--disable-translate',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-hang-monitor',
            '--disable-background-networking',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-features=VizDisplayCompositor,VizHitTestSurfaceLayer',
            '--disable-features=AudioServiceOutOfProcess',
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
            '--disable-features=BackForwardCache',
            '--disable-features=VizDisplayCompositor',
            '--disable-gpu-sandbox',
            '--disable-software-rasterizer',
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
        timeout: 180000, // 3 minutos
        ignoreDefaultArgs: false,
        defaultViewport: {
            width: 1366,
            height: 768
        },
        slowMo: 150, // Delay entre ações para estabilidade
        devtools: false,
        ignoreHTTPSErrors: true,
        waitForInitialPage: true,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
    };
};

const createClient = (username, deviceId) => {
    console.log(`🚀 Criando cliente "${deviceId}" para "${username}"`);
    
    // Verificar dependências antes de criar cliente
    if (!checkCriticalDependencies()) {
        console.error('❌ Dependências críticas não encontradas!');
        return;
    }
    
    // Detectar Chrome/Chromium
    const chromePath = findChromePath();
    if (!chromePath) {
        console.error('❌ ERRO CRÍTICO: Chrome/Chromium não encontrado!');
        return;
    }

    // Configuração ultra-robusta do cliente
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: `${username}-${deviceId}` }),
        puppeteer: getPuppeteerConfig(chromePath),
        qrMaxRetries: 10,
        authTimeoutMs: 180000, // 3 minutos
        takeoverOnConflict: true,
        takeoverTimeoutMs: 180000,
        restartOnAuthFail: true,
        markOnlineOnConnect: true,
        qrRefreshS: 30 // Refresh QR a cada 30 segundos
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
        maxQrRetries: 10,
        initRetries: 0,
        maxInitRetries: 5,
        lastQrTime: null,
        connectionAttempts: 0,
        maxConnectionAttempts: 10
    };
    
    liveClients[username][deviceId] = clientSession;

    const addEntry = (type, data) => {
        const entry = { ...data, timestamp: new Date() };
        if (type === 'log') {
            clientSession.logs.push(entry);
            // Manter apenas os últimos 100 logs
            if (clientSession.logs.length > 100) {
                clientSession.logs = clientSession.logs.slice(-100);
            }
            console.log(`[${username}-${deviceId}] ${entry.message}`);
            io.emit('new_log', { username, clientId: deviceId, log: entry });
        } else if (type === 'message') {
            clientSession.messages.push(entry);
            // Manter apenas as últimas 50 mensagens
            if (clientSession.messages.length > 50) {
                clientSession.messages = clientSession.messages.slice(-50);
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

    // Carregar lógica específica do dispositivo
    const logicPath = path.join(__dirname, 'logics', `${deviceId}.js`);
    if (fs.existsSync(logicPath)) {
        try {
            const attachLogic = require(logicPath);
            attachLogic(client, io, clientSession, addEntry);
            addEntry('log', { message: `✅ Lógica ${deviceId} carregada com sucesso.` });
        } catch (error) {
            addEntry('log', { message: `❌ ERRO ao carregar lógica ${deviceId}: ${error.message}` });
        }
    } else {
        addEntry('log', { message: `⚠️  AVISO: Ficheiro de lógica não encontrado para ${deviceId}.` });
    }

    // EVENTO QR CODE ULTRA-ROBUSTO
    client.on('qr', async (qr) => {
        try {
            addEntry('log', { message: '📱 QR Code recebido. Processando...' });
            clientSession.status = 'Aguardando QR';
            clientSession.lastQrTime = new Date();
            
            // Gerar QR code com configurações otimizadas
            const qrDataURL = await qrcode.toDataURL(qr, {
                errorCorrectionLevel: 'H', // Máxima correção de erro
                type: 'image/png',
                quality: 0.95,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                width: 300
            });
            
            addEntry('log', { message: '✅ QR Code gerado com sucesso! Escaneie com WhatsApp.' });
            
            // Emitir QR code para frontend
            io.emit('qr_code', { 
                username, 
                clientId: deviceId, 
                qrData: qrDataURL,
                timestamp: new Date().toISOString(),
                attempt: clientSession.qrRetries + 1
            });
            
            io.emit('client_update', { username, id: deviceId, status: 'Aguardando QR' });
            
            // Reset contador quando novo QR é gerado
            clientSession.qrRetries = 0;
            
        } catch (error) {
            addEntry('log', { message: `❌ ERRO ao gerar QR Code: ${error.message}` });
            clientSession.qrRetries++;
            
            if (clientSession.qrRetries < clientSession.maxQrRetries) {
                addEntry('log', { message: `🔄 Tentativa ${clientSession.qrRetries}/${clientSession.maxQrRetries} de gerar QR Code...` });
                setTimeout(() => {
                    if (liveClients[username]?.[deviceId]) {
                        addEntry('log', { message: '🔄 Reiniciando cliente para nova tentativa de QR...' });
                        restartClient(username, deviceId);
                    }
                }, 15000); // 15 segundos
            } else {
                addEntry('log', { message: '❌ Máximo de tentativas de QR Code atingido. Reinicie manualmente.' });
                clientSession.status = 'Erro QR';
                io.emit('client_update', { username, id: deviceId, status: 'Erro QR' });
            }
        }
    });

    // EVENTO READY MELHORADO
    client.on('ready', () => {
        addEntry('log', { message: '🎉 Dispositivo conectado com sucesso!' });
        clientSession.status = 'Conectado';
        clientSession.qrRetries = 0;
        clientSession.initRetries = 0;
        clientSession.connectionAttempts = 0;
        io.emit('status_change', { username, clientId: deviceId, status: 'Conectado' });
        io.emit('client_update', { username, id: deviceId, status: 'Conectado' });
        io.emit('qr_code_clear', { username, clientId: deviceId });
    });

    // EVENTO AUTHENTICATED
    client.on('authenticated', () => {
        addEntry('log', { message: '🔐 Autenticação realizada com sucesso.' });
        clientSession.status = 'Autenticado';
    });

    // EVENTO AUTH_FAILURE MELHORADO
    client.on('auth_failure', (msg) => {
        addEntry('log', { message: `❌ Falha na autenticação: ${msg}` });
        clientSession.status = 'Falha Autenticação';
        io.emit('client_update', { username, id: deviceId, status: 'Falha Autenticação' });
        
        // Tentar reinicializar após falha de autenticação
        setTimeout(() => {
            if (liveClients[username]?.[deviceId]) {
                addEntry('log', { message: '🔄 Tentando reinicializar após falha de autenticação...' });
                restartClient(username, deviceId);
            }
        }, 30000); // 30 segundos
    });

    // EVENTO DISCONNECTED MELHORADO
    client.on('disconnected', (reason) => {
        addEntry('log', { message: `🔌 Dispositivo desconectado: ${reason}` });
        if (liveClients[username]?.[deviceId]) {
            clientSession.status = 'Desconectado';
            io.emit('status_change', { username, clientId: deviceId, status: 'Desconectado' });
            io.emit('client_update', { username, id: deviceId, status: 'Desconectado' });
            
            // Tentar reconectar automaticamente
            setTimeout(() => {
                if (liveClients[username]?.[deviceId] && clientSession.connectionAttempts < clientSession.maxConnectionAttempts) {
                    clientSession.connectionAttempts++;
                    addEntry('log', { message: `🔄 Tentativa ${clientSession.connectionAttempts}/${clientSession.maxConnectionAttempts} de reconexão...` });
                    restartClient(username, deviceId);
                }
            }, 60000); // 1 minuto
        }
    });

    // EVENTO DE ERRO ULTRA-ROBUSTO
    client.on('error', (error) => {
        addEntry('log', { message: `❌ ERRO no cliente: ${error.message}` });
        console.error(`[${username}-${deviceId}] ERRO:`, error);
        
        // Tratar diferentes tipos de erro
        if (error.message.includes('Session closed') || 
            error.message.includes('Protocol error') ||
            error.message.includes('Target closed') ||
            error.message.includes('Connection closed')) {
            
            clientSession.initRetries++;
            if (clientSession.initRetries < clientSession.maxInitRetries) {
                addEntry('log', { message: `🔄 Tentativa ${clientSession.initRetries}/${clientSession.maxInitRetries} de recuperação de sessão...` });
                setTimeout(() => {
                    if (liveClients[username]?.[deviceId]) {
                        addEntry('log', { message: '🔄 Reiniciando cliente após erro de sessão...' });
                        restartClient(username, deviceId);
                    }
                }, 20000); // 20 segundos
            } else {
                addEntry('log', { message: '❌ Máximo de tentativas de recuperação atingido.' });
                clientSession.status = 'Erro Crítico';
                io.emit('client_update', { username, id: deviceId, status: 'Erro Crítico' });
            }
        } else if (error.message.includes('libgbm')) {
            addEntry('log', { message: '❌ ERRO libgbm detectado! Instale: sudo apt install -y libgbm1' });
            clientSession.status = 'Erro Dependência';
            io.emit('client_update', { username, id: deviceId, status: 'Erro Dependência' });
        }
    });

    // FUNÇÃO PARA REINICIAR CLIENTE
    const restartClient = (username, deviceId) => {
        try {
            if (liveClients[username]?.[deviceId]?.instance) {
                addEntry('log', { message: '🔄 Destruindo instância atual...' });
                liveClients[username][deviceId].instance.destroy();
            }
            
            setTimeout(() => {
                if (liveClients[username]?.[deviceId]) {
                    addEntry('log', { message: '🚀 Criando nova instância...' });
                    createClient(username, deviceId);
                }
            }, 5000); // 5 segundos de delay
        } catch (error) {
            addEntry('log', { message: `❌ Erro ao reiniciar cliente: ${error.message}` });
        }
    };

    // INICIALIZAÇÃO ULTRA-ROBUSTA
    const initializeClient = () => {
        addEntry('log', { message: '🚀 Iniciando cliente WhatsApp...' });
        addEntry('log', { message: `🌐 Usando Chrome: ${chromePath}` });
        
        client.initialize().catch(err => {
            addEntry('log', { message: `❌ Erro ao inicializar cliente: ${err.message}` });
            console.error(`[${username}-${deviceId}] Erro na inicialização:`, err);
            
            clientSession.initRetries++;
            if (clientSession.initRetries < clientSession.maxInitRetries) {
                const delay = Math.min(30000 * clientSession.initRetries, 120000); // Delay progressivo até 2 minutos
                addEntry('log', { message: `🔄 Tentativa ${clientSession.initRetries}/${clientSession.maxInitRetries} em ${delay/1000}s...` });
                setTimeout(() => {
                    if (liveClients[username]?.[deviceId]) {
                        initializeClient();
                    }
                }, delay);
            } else {
                clientSession.status = 'Erro Inicialização';
                io.emit('client_update', { username, id: deviceId, status: 'Erro Inicialização' });
                addEntry('log', { message: '❌ Máximo de tentativas de inicialização atingido. Use "Reconectar".' });
            }
        });
    };

    // Iniciar cliente
    initializeClient();
};

// EVENTOS SOCKET.IO
io.on('connection', (socket) => {
    console.log('🔌 Nova conexão Socket.IO:', socket.id);

    socket.on('authenticate', (credentials) => {
        if (USERS[credentials.username]?.password === credentials.password) {
            socket.username = credentials.username;
            socket.emit('authenticated', { username: socket.username });
            const userDevices = storage.users[socket.username]?.devices || [];
            socket.emit('client_list', userDevices.map(id => ({ 
                id, 
                status: liveClients[socket.username]?.[id]?.status || 'Desconectado' 
            })));
            console.log(`✅ Usuário autenticado: ${socket.username}`);
        } else {
            socket.emit('unauthorized');
            console.log('❌ Tentativa de login inválida:', credentials.username);
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
            logs: deviceData.logs.slice(-50), // Últimos 50 logs
            recentMessages: deviceData.messages.slice(-20), // Últimas 20 mensagens
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
        console.log(`➕ Dispositivo adicionado: ${socket.username}-${id}`);
    });
    
    socket.on('delete_client', (id) => {
        if (!socket.username || !storage.users[socket.username]) return;

        storage.users[socket.username].devices = storage.users[socket.username].devices.filter(d => d !== id);
        saveStorage();

        if (liveClients[socket.username] && liveClients[socket.username][id]) {
            try {
                liveClients[socket.username][id].instance.destroy();
            } catch (error) {
                console.error('Erro ao destruir cliente:', error.message);
            }
            delete liveClients[socket.username][id];
        }
        io.emit('client_removed', { username: socket.username, id });
        console.log(`➖ Dispositivo removido: ${socket.username}-${id}`);
    });

    socket.on('reconnect_client', (id) => {
        if (!socket.username || !id) return;
        console.log(`🔄 Reconectando dispositivo: ${socket.username}-${id}`);
        
        if (liveClients[socket.username] && liveClients[socket.username][id]) {
            try {
                liveClients[socket.username][id].instance.destroy();
            } catch (error) {
                console.error('Erro ao destruir cliente para reconexão:', error.message);
            }
            delete liveClients[socket.username][id];
        }
        
        // Aguardar antes de recriar
        setTimeout(() => {
            createClient(socket.username, id);
        }, 3000);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Conexão Socket.IO desconectada:', socket.id);
    });
});

// MIDDLEWARE E ROTAS
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// HEALTH CHECK ENDPOINT MELHORADO
app.get('/health', (req, res) => {
    const chromePath = findChromePath();
    const libgbmStatus = (() => {
        try {
            execSync('ldconfig -p | grep libgbm.so.1', { timeout: 3000, stdio: 'pipe' });
            return 'OK';
        } catch {
            return 'MISSING';
        }
    })();
    
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        clients: Object.keys(liveClients).length,
        chromePath: chromePath || 'NOT_FOUND',
        libgbm: libgbmStatus,
        dependencies: {
            chrome: chromePath ? 'OK' : 'MISSING',
            libgbm: libgbmStatus
        }
    });
});

// VERIFICAÇÃO INICIAL COMPLETA
console.log('🔍 Verificando sistema...');
console.log('==========================================');

// Verificar Chrome/Chromium
const chromePath = findChromePath();
if (!chromePath) {
    console.error('❌ ERRO CRÍTICO: Chrome/Chromium não encontrado!');
    console.error('📋 Execute: sudo apt install -y google-chrome-stable');
    process.exit(1);
}

// Verificar dependências críticas
if (!checkCriticalDependencies()) {
    console.error('❌ ERRO CRÍTICO: Dependências não encontradas!');
    console.error('📋 Execute: sudo apt install -y libgbm1 libgbm-dev');
    process.exit(1);
}

console.log('✅ Todas as verificações passaram!');
console.log('==========================================');

// INICIALIZAÇÃO DO SERVIDOR
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Dashboard: http://localhost:${PORT}`);
    console.log(`🌐 Chrome: ${chromePath}`);
    console.log(`🔧 Health Check: http://localhost:${PORT}/health`);
    console.log('==========================================');
    
    // Carregar storage e recriar clientes existentes
    loadStorage();
    let deviceCount = 0;
    for (const username in storage.users) {
        for (const deviceId of storage.users[username].devices) {
            console.log(`🔄 Recriando cliente: ${username}-${deviceId}`);
            setTimeout(() => {
                createClient(username, deviceId);
            }, 10000 * deviceCount); // Delay escalonado de 10s entre cada cliente
            deviceCount++;
        }
    }
    
    if (deviceCount > 0) {
        console.log(`📱 ${deviceCount} dispositivos serão recriados com delay escalonado`);
    }
});

// TRATAMENTO DE SINAIS DE SISTEMA
process.on('SIGINT', () => {
    console.log('🛑 Encerrando servidor...');
    
    // Destruir todos os clientes ativos
    for (const username in liveClients) {
        for (const deviceId in liveClients[username]) {
            try {
                if (liveClients[username][deviceId].instance) {
                    liveClients[username][deviceId].instance.destroy();
                }
            } catch (error) {
                console.error(`Erro ao destruir cliente ${username}-${deviceId}:`, error.message);
            }
        }
    }
    
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
    console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
    console.error('Promise:', promise);
});

