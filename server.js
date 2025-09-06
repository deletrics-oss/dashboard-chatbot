import express from "express";
import http from "http";
import { Server } from "socket.io";
import pkg from "whatsapp-web.js";
import path from "path";
import { fileURLToPath } from "url";
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
async function loadLogic(fileName) {
  try {
    const filePath = path.join(logicsDir, fileName);
    const logicName = path.basename(fileName, '.js');
    
    // Importar dinamicamente com URL absoluta e cache busting
    const fileUrl = `file://${filePath}?t=${Date.now()}`;
    const module = await import(fileUrl);
    
    // Procurar por função handler (pode ter nomes diferentes)
    let handler = null;
    const possibleNames = [
      `handle${logicName.charAt(0).toUpperCase() + logicName.slice(1).replace(/-/g, '')}Message`,
      'handleMessage',
      'handle'
    ];
    
    for (const name of possibleNames) {
      if (typeof module[name] === 'function') {
        handler = module[name];
        break;
      }
    }
    
    if (!handler) {
      // Tentar pegar a primeira função exportada
      const exports = Object.keys(module);
      const firstFunction = exports.find(key => typeof module[key] === 'function');
      if (firstFunction) {
        handler = module[firstFunction];
      }
    }
    
    if (handler) {
      loadedLogics.set(logicName, { handler, filePath });
      console.log(`✅ Lógica '${logicName}' carregada com sucesso`);
      return true;
    } else {
      console.error(`❌ Nenhuma função handler encontrada em '${fileName}'`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erro ao carregar lógica '${fileName}':`, error.message);
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
    const fileName = `${name}.js`;
    const filePath = path.join(logicsDir, fileName);
    
    // Validar código básico
    if (!code.includes('export') || !code.includes('function')) {
      throw new Error('Código deve conter export function');
    }
    
    // Salvar arquivo
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
    return { success: false, message: error.message };
  }
}

// Monitorar mudanças na pasta logics
if (fs.existsSync(logicsDir)) {
  fs.watch(logicsDir, (eventType, filename) => {
    if (filename && filename.endsWith('.js')) {
      console.log(`📁 Mudança detectada em: ${filename}`);
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
    }
    console.log("✅ Usuários carregados com sucesso");
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
    // CONFIGURAÇÃO SIMPLIFICADA IGUAL AO ORIGINAL QUE FUNCIONA
    const wweb = new Client({
      authStrategy: new LocalAuth({ clientId: deviceId }),
      puppeteer: { 
        headless: true, 
        args: ["--no-sandbox", "--disable-setuid-sandbox"] // APENAS OS ARGUMENTOS ESSENCIAIS
      },
    });

    // STATUS INICIAL IGUAL AO ORIGINAL
    clients.set(deviceId, { wweb, status: "QR Code Necessário", lastQr: null });

    wweb.on("qr", (qr) => {
      clients.get(deviceId).lastQr = qr;
      clients.get(deviceId).status = "QR Code Necessário";
      io.emit("qr_code", { clientId: deviceId, qr });
      io.emit("status_change", { clientId: deviceId, status: "QR Code Necessário" });
      console.log(`📱 QR Code gerado para ${deviceId}`);
    });

    wweb.on("ready", () => {
      clients.get(deviceId).status = "Conectado";
      io.emit("status_change", { clientId: deviceId, status: "Conectado" });
      console.log(`✅ Cliente ${deviceId} conectado`);
    });

    wweb.on("authenticated", () => {
      clients.get(deviceId).status = "Conectando…";
      io.emit("status_change", { clientId: deviceId, status: "Conectando…" });
      console.log(`🔐 Cliente ${deviceId} autenticado`);
    });

    wweb.on("disconnected", (reason) => {
      clients.get(deviceId).status = "Desconectado";
      io.emit("status_change", { clientId: deviceId, status: "Desconectado", reason });
      console.log(`❌ Cliente ${deviceId} desconectado:`, reason);
      
      // RECONEXÃO SIMPLES IGUAL AO ORIGINAL
      wweb.initialize();
    });

    wweb.on("message", async (msg) => {
      dashboardStats.messagesToday++;
      
      // Atualizar estatísticas por hora
      const now = new Date();
      const hourKey = now.getHours().toString().padStart(2, '0') + ':00';
      if (dashboardStats.messagesByHour[hourKey] !== undefined) {
        dashboardStats.messagesByHour[hourKey]++;
      }
      
      io.emit("new_message", {
        clientId: deviceId,
        message: { from: msg.from, body: msg.body, timestamp: Date.now() },
      });

      // Processar com lógicas dinâmicas
      try {
        const logic = loadedLogics.get(deviceId);
        if (logic && logic.handler) {
          await logic.handler(msg, wweb);
        } else {
          // Tentar lógicas genéricas ou por padrão de nome
          for (const [logicName, logicData] of loadedLogics) {
            if (deviceId.includes(logicName) || logicName.includes(deviceId)) {
              await logicData.handler(msg, wweb);
              break;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao processar mensagem para ${deviceId}:`, error.message);
      }
    });

    wweb.initialize();
    console.log(`🚀 Inicializando cliente WhatsApp: ${deviceId}`);
  } catch (error) {
    console.error(`❌ Erro ao configurar cliente ${deviceId}:`, error.message);
  }
}

io.on("connection", (socket) => {
  console.log("🔌 Nova conexão Socket.IO:", socket.id);
  
  // login com arquivo users.json
  socket.on("authenticate", ({ username, password }) => {
    const ok = USERS.find((u) => u.username === username && u.password === password);
    if (!ok) {
      console.log(`❌ Tentativa de login falhada: ${username}`);
      return socket.emit("unauthorized");
    }
    socket.data.username = username;
    socket.emit("authenticated", { username });
    socket.emit("client_list", asClientList());
    socket.emit('logics_list', Array.from(loadedLogics.keys()).map(name => ({ name })));
    console.log(`✅ Usuário autenticado: ${username}`);
  });

  socket.on("get_client_list", () => socket.emit("client_list", asClientList()));

  socket.on("add_client", ({ deviceId }) => {
    if (!deviceId) return;
    if (!clients.has(deviceId)) {
      setupWhatsClient(deviceId);
      console.log(`➕ Novo cliente adicionado: ${deviceId}`);
    }
    io.emit("client_list", asClientList());
  });

  socket.on("select_client", ({ clientId }) => {
    const entry = clients.get(clientId);
    if (!entry) return;
    socket.emit("status_change", { clientId, status: entry.status || "Desconectado" });
    if (entry.lastQr) socket.emit("qr_code", { clientId, qr: entry.lastQr });
  });

  socket.on("generate_qr", ({ clientId }) => {
    const entry = clients.get(clientId);
    if (!entry) return;
    if (entry.lastQr) socket.emit("qr_code", { clientId, qr: entry.lastQr });
  });

  socket.on("get_dashboard_data", () => {
    const uptimeMs = Date.now() - dashboardStats.uptimeStart;
    const mins = Math.floor(uptimeMs / 60000);
    
    // Preparar dados do gráfico
    const chartLabels = Object.keys(dashboardStats.messagesByHour);
    const chartData = Object.values(dashboardStats.messagesByHour);
    
    socket.emit("dashboard_data", {
      messagesToday: dashboardStats.messagesToday,
      activeUsers: dashboardStats.activeUsers,
      uptime: `${mins}m`,
      connectionStatus: "—",
      activeUsersList: [],
      chartLabels,
      chartData,
    });
  });

  // Eventos de lógicas (híbrido: pasta + interface)
  socket.on('get_logics_list', () => {
    socket.emit('logics_list', Array.from(loadedLogics.keys()).map(name => ({ name })));
  });

  socket.on('add_logic', async ({ name, code }) => {
    if (!name || !code) {
      return socket.emit('logic_result', { success: false, message: 'Nome e código são obrigatórios' });
    }
    
    const result = await saveLogic(name, code);
    socket.emit('logic_result', result);
  });

  socket.on('remove_logic', async ({ name }) => {
    if (!name) {
      return socket.emit('logic_result', { success: false, message: 'Nome é obrigatório' });
    }
    
    const result = await removeLogic(name);
    socket.emit('logic_result', result);
  });

  // Recarregar lógicas manualmente
  socket.on('reload_logics', async () => {
    const success = await loadAllLogics();
    socket.emit('logics_reloaded', { success });
  });

  socket.on("disconnect", () => {
    console.log("🔌 Conexão Socket.IO desconectada:", socket.id);
  });
});

// API REST para lógicas
app.get('/api/logics', (req, res) => {
  res.json(Array.from(loadedLogics.keys()).map(name => ({ name })));
});

app.post('/api/logics', async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    return res.status(400).json({ success: false, message: 'Nome e código são obrigatórios' });
  }
  
  const result = await saveLogic(name, code);
  res.json(result);
});

app.delete('/api/logics/:name', async (req, res) => {
  const { name } = req.params;
  const result = await removeLogic(name);
  res.json(result);
});

app.post('/api/logics/reload', async (req, res) => {
  const success = await loadAllLogics();
  res.json({ success, message: success ? 'Lógicas recarregadas' : 'Erro ao recarregar lógicas' });
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
});

// Carregar lógicas na inicialização
loadAllLogics();

// Atualizar estatísticas periodicamente
setInterval(() => {
  // Rotacionar dados de mensagens por hora
  const now = new Date();
  const currentHour = now.getHours().toString().padStart(2, '0') + ':00';
  
  // Remover horas antigas e adicionar nova se necessário
  const hours = Object.keys(dashboardStats.messagesByHour);
  if (hours.length > 24) {
    delete dashboardStats.messagesByHour[hours[0]];
  }
  
  if (!dashboardStats.messagesByHour[currentHour]) {
    dashboardStats.messagesByHour[currentHour] = 0;
  }
}, 60000); // A cada minuto

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`✅ Servidor rodando em http://${HOST}:${PORT}`);
  console.log(`📊 Dashboard disponível em: http://localhost:${PORT}`);
  console.log(`🕐 Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🎯 ${loadedLogics.size} lógicas carregadas`);
  console.log(`📁 Monitorando pasta: ${logicsDir}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado graciosamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado graciosamente');
    process.exit(0);
  });
});

