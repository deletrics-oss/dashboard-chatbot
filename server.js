import express from "express";
import http from "http";
import { Server } from "socket.io";
import pkg from "whatsapp-web.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const { Client, LocalAuth } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware para parsing JSON
app.use(express.json());

// servir frontend (public/index.html etc.)
app.use(express.static(path.join(__dirname, "public")));

// === Sistema Híbrido de Lógicas (pasta + interface) ===
const logicsDir = path.join(__dirname, "logics");
let loadedLogics = new Map(); // nome -> { handler, filePath }

// Garantir que a pasta logics existe
if (!fs.existsSync(logicsDir)) {
  fs.mkdirSync(logicsDir, { recursive: true });
  console.log("📁 Pasta logics criada");
}

// Função para carregar uma lógica específica
async function loadLogic(filename) {
  try {
    const filePath = path.join(logicsDir, filename);
    const logicName = path.basename(filename, '.js');
    
    // Importar dinamicamente com URL absoluta e cache busting
    const fileUrl = `file://${filePath}?t=${Date.now()}`;
    const module = await import(fileUrl);
    
    // Procurar por função handler (pode ter nomes diferentes)
    let handler = null;
    const possibleNames = [
      `handle${logicName.charAt(0).toUpperCase() + logicName.slice(1)}Message`,
      'handleMessage',
      'handle'
    ];
    
    for (const name of possibleNames) {
      if (typeof module[name] === 'function') {
        handler = module[name];
        break;
      }
    }
    
    if (handler) {
      loadedLogics.set(logicName, { handler, filePath });
      console.log(`✅ Lógica '${logicName}' carregada com sucesso`);
      return true;
    } else {
      console.error(`❌ Nenhuma função handler encontrada em '${filename}'`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erro ao carregar lógica '${filename}':`, error.message);
    return false;
  }
}

// Função para carregar todas as lógicas da pasta
async function loadAllLogics() {
  try {
    const files = fs.readdirSync(logicsDir).filter(file => file.endsWith('.js'));
    console.log(`📂 Encontrados ${files.length} arquivos de lógica`);
    
    // Limpar lógicas anteriores
    loadedLogics.clear();
    
    for (const file of files) {
      await loadLogic(file);
    }
    
    console.log(`🎯 ${loadedLogics.size} lógicas carregadas`);
    
    // Emitir lista atualizada para todos os clientes conectados
    io.emit('logics_list', Array.from(loadedLogics.keys()).map(name => ({ name })));
    return true;
  } catch (error) {
    console.error("❌ Erro ao carregar lógicas:", error.message);
    return false;
  }
}

// Função para salvar nova lógica
async function saveLogic(name, code) {
  try {
    // Validar código básico
    if (!code.includes('export') || !code.includes('function')) {
      throw new Error('Código deve conter export function');
    }
    
    // Salvar arquivo
    const fileName = `${name}.js`;
    const filePath = path.join(logicsDir, fileName);
    fs.writeFileSync(filePath, code, 'utf8');
    
    // Carregar a nova lógica
    const success = await loadLogic(fileName);
    if (success) {
      // Emitir lista atualizada
      io.emit('logics_list', Array.from(loadedLogics.keys()).map(name => ({ name })));
      return { success: true, message: 'Lógica salva e carregada com sucesso' };
    } else {
      // Remover arquivo se não carregou
      fs.unlinkSync(filePath);
      return { success: false, message: 'Erro ao carregar lógica após salvar' };
    }
  } catch (error) {
    console.error(`❌ Erro ao salvar lógica '${name}':`, error.message);
    return { success: false, message: error.message };
  }
}

// Função para remover lógica
async function removeLogic(name) {
  try {
    const filePath = path.join(logicsDir, `${name}.js`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      loadedLogics.delete(name);
      
      // Emitir lista atualizada
      io.emit('logics_list', Array.from(loadedLogics.keys()).map(name => ({ name })));
      return { success: true, message: 'Lógica removida com sucesso' };
    } else {
      return { success: false, message: 'Arquivo de lógica não encontrado' };
    }
  } catch (error) {
    console.error(`❌ Erro ao remover lógica '${name}':`, error.message);
    return { success: false, message: error.message };
  }
}

// Monitorar mudanças na pasta logics
if (fs.existsSync(logicsDir)) {
  fs.watch(logicsDir, (eventType, filename) => {
    if (filename && filename.endsWith('.js')) {
      console.log(`👁️ Mudança detectada em: ${filename}`);
      setTimeout(() => {
        loadAllLogics(); // Recarregar todas as lógicas
      }, 1000); // Delay para garantir que o arquivo foi completamente escrito
    }
  });
}

// === Usuários em arquivo separado (users.json na raiz) ===
const usersFile = path.join(__dirname, "users.json");
let USERS = [];

function loadUsers() {
  try {
    if (fs.existsSync(usersFile)) {
      USERS = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    } else {
      USERS = [
        { "username": "admin1", "password": "suporte@1" },
        { "username": "admin2", "password": "suporte@1" },
        { "username": "admin3", "password": "suporte@1" },
        { "username": "admin4", "password": "suporte@1" },
        { "username": "admin5", "password": "suporte@1" }
      ];
      fs.writeFileSync(usersFile, JSON.stringify(USERS, null, 2));
      console.log("✅ Usuários carregados com sucesso");
    }
  } catch (error) {
    console.error("❌ Erro ao carregar usuários:", error.message);
    USERS = [{ "username": "admin1", "password": "suporte@1" }];
  }
}

loadUsers();

// === Sistema de Estatísticas Melhorado ===
const clients = new Map(); // deviceId -> { wweb:Client, status, lastQr }
const dashboardStats = {
  messagesToday: 0,
  activeUsers: 0,
  uptimeStart: Date.now(),
  messagesByHour: {} // Armazenar mensagens por hora
};

// Inicializar dados de mensagens por hora
function initializeMessagesByHour() {
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourKey = hour.getHours().toString().padStart(2, '0') + ':00';
    dashboardStats.messagesByHour[hourKey] = 0;
  }
}

initializeMessagesByHour();

const asClientList = () =>
  Array.from(clients.entries()).map(([id, c]) => ({ id, status: c.status || "Desconectado" }));

function setupWhatsClient(deviceId) {
  try {
    // Configuração OTIMIZADA do WhatsApp Web para resolver problemas de conexão
    const wweb = new Client({
      authStrategy: new LocalAuth({ 
        clientId: deviceId,
        dataPath: "./.wwebjs_auth"
      }),
      puppeteer: { 
        headless: true,
        args: [
          "--no-sandbox", 
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-extensions",
          "--disable-plugins",
          "--disable-default-apps",
          "--no-default-browser-check",
          "--disable-background-networking",
          "--disable-sync",
          "--disable-translate",
          "--single-process",
          "--disable-ipc-flooding-protection",
          "--disable-hang-monitor",
          "--disable-prompt-on-repost",
          "--disable-domain-reliability",
          "--disable-component-extensions-with-background-pages"
        ],
        timeout: 120000, // 2 minutos para timeout
        slowMo: 100      // Delay entre ações para estabilidade
      },
      // CONFIGURAÇÕES CRÍTICAS PARA RESOLVER PROBLEMA DE CONEXÃO
      qrMaxRetries: 10,           // Aumentar tentativas de QR
      authTimeoutMs: 120000,      // 2 minutos para autenticação
      qrTimeoutMs: 60000,         // 1 minuto para QR code
      restartOnAuthFail: true,    // Reiniciar em caso de falha
      takeoverOnConflict: false,  // Não assumir controle de outras sessões
      takeoverTimeoutMs: 0,       // Sem timeout de takeover
      
      // Configuração de WebVersion para estabilidade
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      }
    });

    clients.set(deviceId, { wweb, status: "Inicializando", lastQr: null });

    // Sistema Keep-Alive MELHORADO para manter conexão estável
    const setupKeepAlive = (wweb, deviceId) => {
      let keepAliveInterval;
      let healthCheckCount = 0;
      
      const startKeepAlive = () => {
        keepAliveInterval = setInterval(async () => {
          try {
            const state = await wweb.getState();
            healthCheckCount++;
            
            if (state === 'CONNECTED') {
              console.log(`💓 Keep-alive #${healthCheckCount}: ${deviceId} - CONECTADO`);
              
              // Reset contador em caso de sucesso
              if (healthCheckCount >= 10) {
                healthCheckCount = 0;
              }
            } else {
              console.log(`⚠️ Keep-alive #${healthCheckCount}: ${deviceId} - Estado: ${state}`);
              
              // Se não conectado por muito tempo, tentar reconectar
              if (healthCheckCount >= 3) {
                console.log(`🔄 Iniciando reconexão para ${deviceId} após ${healthCheckCount} falhas`);
                clearInterval(keepAliveInterval);
                attemptReconnect(deviceId);
              }
            }
          } catch (error) {
            console.error(`❌ Keep-alive falhou para ${deviceId}:`, error.message);
            clearInterval(keepAliveInterval);
            attemptReconnect(deviceId);
          }
        }, 45000); // A cada 45 segundos (mais conservador)
      };
      
      const stopKeepAlive = () => {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
          healthCheckCount = 0;
        }
      };
      
      return { startKeepAlive, stopKeepAlive };
    };

    // Sistema de Reconexão INTELIGENTE E ROBUSTO
    const attemptReconnect = async (deviceId, attempt = 1) => {
      const maxAttempts = 8; // Mais tentativas
      const baseDelay = 5000; // 5 segundos base
      const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 60000); // Backoff exponencial, max 1 minuto
      
      console.log(`🔄 Reconexão ${attempt}/${maxAttempts} para ${deviceId} em ${delay/1000}s`);
      
      // Atualizar status no frontend
      const client = clients.get(deviceId);
      if (client) {
        client.status = `Reconectando... (${attempt}/${maxAttempts})`;
        io.emit("status_change", { 
          clientId: deviceId, 
          status: client.status 
        });
      }
      
      if (attempt <= maxAttempts) {
        setTimeout(async () => {
          try {
            const client = clients.get(deviceId);
            if (client && client.wweb) {
              // Parar keep-alive anterior
              if (client.keepAlive) {
                client.keepAlive.stopKeepAlive();
              }
              
              // Destruir cliente anterior COMPLETAMENTE
              try {
                await client.wweb.destroy();
                console.log(`🗑️ Cliente anterior destruído para ${deviceId}`);
              } catch (e) {
                console.log(`⚠️ Erro ao destruir cliente anterior: ${e.message}`);
              }
              
              // Aguardar um pouco antes de recriar
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Criar novo cliente
              console.log(`🚀 Criando novo cliente para ${deviceId} (tentativa ${attempt})`);
              setupWhatsClient(deviceId);
            }
          } catch (error) {
            console.error(`❌ Erro na tentativa ${attempt} para ${deviceId}:`, error.message);
            if (attempt < maxAttempts) {
              attemptReconnect(deviceId, attempt + 1);
            } else {
              console.error(`💀 Falha definitiva na reconexão de ${deviceId}`);
              // Marcar como falha definitiva
              const client = clients.get(deviceId);
              if (client) {
                client.status = "Erro - Clique em Reiniciar Conexão";
                io.emit("status_change", { 
                  clientId: deviceId, 
                  status: client.status 
                });
              }
            }
          }
        }, delay);
      }
    };

    // EVENTOS DO WHATSAPP WEB COM LOGS DETALHADOS

    wweb.on("loading_screen", (percent, message) => {
      const status = `Carregando ${percent}%`;
      clients.get(deviceId).status = status;
      io.emit("status_change", { clientId: deviceId, status });
      console.log(`📱 ${deviceId} - ${status} - ${message}`);
    });

    wweb.on("qr", (qr) => {
      clients.get(deviceId).lastQr = qr;
      clients.get(deviceId).status = "QR Code Necessário";
      io.emit("qr_code", { clientId: deviceId, qr });
      io.emit("status_change", { clientId: deviceId, status: "QR Code Necessário" });
      console.log(`📱 QR Code gerado para ${deviceId} - Tamanho: ${qr.length} chars`);
    });

    wweb.on("authenticated", () => {
      clients.get(deviceId).status = "Autenticado - Conectando...";
      io.emit("status_change", { clientId: deviceId, status: "Autenticado - Conectando..." });
      console.log(`🔐 Cliente ${deviceId} autenticado com sucesso`);
    });

    wweb.on("ready", async () => {
      try {
        const info = wweb.info;
        clients.get(deviceId).status = "Conectado";
        io.emit("status_change", { clientId: deviceId, status: "Conectado" });
        console.log(`✅ Cliente ${deviceId} conectado e pronto!`);
        console.log(`📞 Número: ${info.wid.user}`);
        console.log(`👤 Nome: ${info.pushname}`);
        
        // Iniciar keep-alive para manter conexão estável
        const keepAlive = setupKeepAlive(wweb, deviceId);
        clients.get(deviceId).keepAlive = keepAlive;
        keepAlive.startKeepAlive();
        
        // Emitir informações do cliente conectado
        io.emit("client_info", { 
          clientId: deviceId, 
          number: info.wid.user,
          name: info.pushname,
          status: "Conectado"
        });
        
      } catch (error) {
        console.error(`❌ Erro ao processar evento ready para ${deviceId}:`, error.message);
      }
    });

    wweb.on("auth_failure", (msg) => {
      clients.get(deviceId).status = "Falha na Autenticação";
      io.emit("status_change", { clientId: deviceId, status: "Falha na Autenticação" });
      console.log(`❌ Falha na autenticação ${deviceId}:`, msg);
      
      // Tentar reconectar após falha de autenticação
      setTimeout(() => {
        console.log(`🔄 Tentando reconectar ${deviceId} após falha de autenticação`);
        attemptReconnect(deviceId);
      }, 10000); // Aguardar 10 segundos
    });

    wweb.on("disconnected", (reason) => {
      console.log(`❌ Cliente ${deviceId} desconectado: ${reason}`);
      
      // Parar keep-alive
      const client = clients.get(deviceId);
      if (client?.keepAlive) {
        client.keepAlive.stopKeepAlive();
      }
      
      client.status = `Desconectado (${reason})`;
      io.emit("status_change", { 
        clientId: deviceId, 
        status: client.status,
        reason 
      });
      
      // Reconexão inteligente baseada no motivo da desconexão
      const shouldReconnect = ![
        'NAVIGATION', 
        'LOGOUT', 
        'CONFLICT', 
        'UNLAUNCHED'
      ].includes(reason);
      
      if (shouldReconnect) {
        console.log(`🔄 Iniciando reconexão automática para ${deviceId}`);
        setTimeout(() => {
          attemptReconnect(deviceId);
        }, 5000); // Aguardar 5 segundos antes de reconectar
      } else {
        console.log(`⏹️ Não reconectando ${deviceId} - Motivo: ${reason}`);
      }
    });

    // Evento de mudança de estado
    wweb.on("change_state", (state) => {
      console.log(`🔄 ${deviceId} - Estado alterado para: ${state}`);
      
      // Atualizar status baseado no estado
      let status = "Desconhecido";
      switch (state) {
        case 'CONFLICT':
          status = "Conflito - WhatsApp aberto em outro lugar";
          break;
        case 'CONNECTED':
          status = "Conectado";
          break;
        case 'DEPRECATED_VERSION':
          status = "Versão desatualizada";
          break;
        case 'OPENING':
          status = "Abrindo WhatsApp Web...";
          break;
        case 'PAIRING':
          status = "Pareando dispositivo...";
          break;
        case 'SMB_TOS_BLOCK':
          status = "Bloqueado pelos termos de serviço";
          break;
        case 'TIMEOUT':
          status = "Timeout - Tente novamente";
          break;
        case 'TOS_BLOCK':
          status = "Bloqueado pelos termos de serviço";
          break;
        case 'UNLAUNCHED':
          status = "Não iniciado";
          break;
        case 'UNPAIRED':
          status = "Não pareado";
          break;
        case 'UNPAIRED_IDLE':
          status = "Não pareado (inativo)";
          break;
        default:
          status = `Estado: ${state}`;
      }
      
      const client = clients.get(deviceId);
      if (client) {
        client.status = status;
        io.emit("status_change", { clientId: deviceId, status });
      }
    });

    wweb.on("message", async (msg) => {
      try {
        dashboardStats.messagesToday++;
        
        // Atualizar estatísticas por hora
        const now = new Date();
        const hourKey = now.getHours().toString().padStart(2, '0') + ':00';
        if (dashboardStats.messagesByHour[hourKey] !== undefined) {
          dashboardStats.messagesByHour[hourKey]++;
        }
        
        io.emit("new_message", {
          clientId: deviceId,
          from: msg.from,
          body: msg.body,
          timestamp: msg.timestamp,
          type: msg.type
        });
        
        io.emit("dashboard_stats", dashboardStats);
        
        console.log(`📨 ${deviceId} - Nova mensagem de ${msg.from}: ${msg.body.substring(0, 50)}...`);
        
        // Processar lógicas carregadas
        for (const [logicName, { handler }] of loadedLogics) {
          try {
            await handler(msg, wweb);
          } catch (error) {
            console.error(`❌ Erro na lógica '${logicName}':`, error.message);
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao processar mensagem para ${deviceId}:`, error.message);
      }
    });

    // Inicializar cliente
    console.log(`🚀 Inicializando cliente WhatsApp para ${deviceId}...`);
    wweb.initialize().catch(error => {
      console.error(`❌ Erro ao inicializar ${deviceId}:`, error.message);
      attemptReconnect(deviceId);
    });

  } catch (error) {
    console.error(`❌ Erro ao configurar cliente ${deviceId}:`, error.message);
    clients.get(deviceId).status = "Erro na Configuração";
    io.emit("status_change", { 
      clientId: deviceId, 
      status: "Erro na Configuração" 
    });
  }
}

// === ROTAS DA API ===

// Rota para listar lógicas
app.get('/api/logics', (req, res) => {
  const logics = Array.from(loadedLogics.keys()).map(name => ({ name }));
  res.json(logics);
});

// Rota para adicionar lógica
app.post('/api/logics', async (req, res) => {
  const { name, code } = req.body;
  
  if (!name || !code) {
    return res.status(400).json({ success: false, message: 'Nome e código são obrigatórios' });
  }
  
  const result = await saveLogic(name, code);
  res.json(result);
});

// Rota para remover lógica
app.delete('/api/logics/:name', async (req, res) => {
  const { name } = req.params;
  const result = await removeLogic(name);
  res.json(result);
});

// Rota para obter estatísticas
app.get('/api/stats', (req, res) => {
  res.json({
    ...dashboardStats,
    clients: asClientList(),
    uptime: Date.now() - dashboardStats.uptimeStart
  });
});

// === SOCKET.IO EVENTS ===

io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado ao dashboard");

  // Enviar dados iniciais
  socket.emit("clients_list", asClientList());
  socket.emit("dashboard_stats", dashboardStats);
  socket.emit('logics_list', Array.from(loadedLogics.keys()).map(name => ({ name })));

  socket.on("login", (data) => {
    const { username, password } = data;
    const user = USERS.find(u => u.username === username && u.password === password);
    
    if (user) {
      socket.emit("login_success", { username });
      console.log(`✅ Login bem-sucedido: ${username}`);
    } else {
      socket.emit("login_error", "Credenciais inválidas");
      console.log(`❌ Tentativa de login falhada: ${username}`);
    }
  });

  socket.on("add_device", (deviceId) => {
    if (!clients.has(deviceId)) {
      console.log(`➕ Adicionando dispositivo: ${deviceId}`);
      setupWhatsClient(deviceId);
      socket.emit("device_added", deviceId);
    } else {
      socket.emit("device_error", "Dispositivo já existe");
    }
  });

  socket.on("restart_client", (deviceId) => {
    console.log(`🔄 Reiniciando cliente: ${deviceId}`);
    
    const client = clients.get(deviceId);
    if (client) {
      // Parar keep-alive
      if (client.keepAlive) {
        client.keepAlive.stopKeepAlive();
      }
      
      // Destruir cliente atual
      client.wweb.destroy().then(() => {
        console.log(`🗑️ Cliente ${deviceId} destruído`);
        // Recriar cliente
        setTimeout(() => {
          setupWhatsClient(deviceId);
        }, 2000);
      }).catch(error => {
        console.error(`❌ Erro ao destruir cliente ${deviceId}:`, error.message);
        // Recriar mesmo assim
        setTimeout(() => {
          setupWhatsClient(deviceId);
        }, 2000);
      });
    }
  });

  socket.on("generate_qr", (deviceId) => {
    console.log(`📱 Gerando novo QR para: ${deviceId}`);
    
    const client = clients.get(deviceId);
    if (client && client.lastQr) {
      socket.emit("qr_code", { clientId: deviceId, qr: client.lastQr });
    } else {
      socket.emit("qr_error", "QR Code não disponível");
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 Cliente desconectado do dashboard");
  });
});

// === INICIALIZAÇÃO ===

// Carregar lógicas na inicialização
loadAllLogics().then(() => {
  console.log("🎯 Sistema de lógicas inicializado");
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando aplicação...');
  
  // Destruir todos os clientes WhatsApp
  for (const [deviceId, client] of clients) {
    try {
      if (client.keepAlive) {
        client.keepAlive.stopKeepAlive();
      }
      await client.wweb.destroy();
      console.log(`✅ Cliente ${deviceId} encerrado`);
    } catch (error) {
      console.error(`❌ Erro ao encerrar cliente ${deviceId}:`, error.message);
    }
  }
  
  process.exit(0);
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`📊 Dashboard inicializado com ${loadedLogics.size} lógicas`);
});

