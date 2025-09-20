import express from "express";
import http from "http";
import { Server } from "socket.io";
import pkg from "whatsapp-web.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const { Client, LocalAuth } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const logicsDir = path.join(__dirname, "logics");
if (!fs.existsSync(logicsDir)) fs.mkdirSync(logicsDir, { recursive: true });

let loadedLogics = new Map();

async function loadLogic(fileName) {
  try {
    const filePath = path.join(logicsDir, fileName);
    const logicName = path.basename(fileName, '.js');
    const fileUrl = `file://${filePath}?t=${Date.now()}`;
    const module = await import(fileUrl);
    
    const handler = module.handler || Object.values(module).find(exp => typeof exp === 'function');
    
    if (!handler) {
      console.warn(`⚠️ Nenhuma função handler exportada encontrada em ${fileName}`);
      return false;
    }
    
    loadedLogics.set(logicName, { handler, filePath });
    console.log(`✅ Lógica carregada: ${logicName}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao carregar lógica ${fileName}:`, error);
    return false;
  }
}

async function loadAllLogics() {
  loadedLogics.clear();
  const files = fs.readdirSync(logicsDir).filter(f => f.endsWith('.js'));
  for (const file of files) await loadLogic(file);
  console.log(`🎯 ${loadedLogics.size} lógicas carregadas.`);
}

await loadAllLogics();

const USERS_FILE = path.join(__dirname, "users.json");
let USERS = [];
if (fs.existsSync(USERS_FILE)) {
    try { USERS = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); }
    catch (e) { console.error("Erro ao carregar users.json"); }
}
if (USERS.length === 0) {
    USERS = [{ username: "admin1", password: "suporte@1" }];
    fs.writeFileSync(USERS_FILE, JSON.stringify(USERS, null, 2));
}

const clients = new Map();

function cleanupClient(deviceId) {
  const client = clients.get(deviceId);
  if (!client) return;
  try {
    if (client.wweb) {
      client.wweb.removeAllListeners();
      client.wweb.destroy().catch(err => console.error(`Erro ao destruir cliente ${deviceId}:`, err));
    }
    console.log(`🧹 Recursos limpos para ${deviceId}`);
  } catch (error) {
    console.error(`❌ Erro ao limpar recursos para ${deviceId}:`, error);
  }
}

function setupWhatsClient(deviceId) {
  try {
    if (clients.has(deviceId)) cleanupClient(deviceId);

    const wweb = new Client({
      authStrategy: new LocalAuth({ clientId: deviceId }),
      puppeteer: { 
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
      },
    });

    const stats = {
        messagesToday: 0,
        connectedAt: null,
        uniqueUsers: new Set(),
    };
    clients.set(deviceId, { wweb, status: "Inicializando", lastQr: null, stats });
    
    const updateStatus = (status) => {
        if(clients.has(deviceId)) clients.get(deviceId).status = status;
        io.emit("status_change", { clientId: deviceId, status });
    };

    wweb.on("loading_screen", (percent) => updateStatus(`Carregando ${percent}%`));
    wweb.on("qr", (qr) => {
      if(clients.has(deviceId)) clients.get(deviceId).lastQr = qr;
      updateStatus("QR Code Necessário");
      io.emit("qr_code", { clientId: deviceId, qr });
    });
    wweb.on("ready", () => {
        updateStatus("Conectado");
        if(clients.has(deviceId)) clients.get(deviceId).stats.connectedAt = new Date();
    });
    wweb.on("authenticated", () => updateStatus("Autenticado"));
    wweb.on("auth_failure", () => updateStatus("Falha na Autenticação"));
    wweb.on("disconnected", () => {
        updateStatus("Desconectado");
        if(clients.has(deviceId)) clients.get(deviceId).stats.connectedAt = null;
        cleanupClient(deviceId);
    });

    wweb.on("message", async (msg) => {
      if (!msg.from.endsWith('@c.us')) return;
      
      const clientData = clients.get(deviceId);
      if(clientData) {
          clientData.stats.messagesToday++;
          clientData.stats.uniqueUsers.add(msg.from);
      }

      io.emit("new_message", { clientId: deviceId, message: { from: msg.from, body: msg.body, timestamp: Date.now() } });
      try {
        for (const logic of loadedLogics.values()) {
          // --- CORREÇÃO CRÍTICA ---
          // Agora o deviceId é passado para a função handler da sua lógica.
          if (logic && logic.handler) await logic.handler(msg, wweb, deviceId);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar mensagem para ${deviceId}:`, error);
      }
    });

    wweb.initialize().catch(err => {
        console.error(`Erro ao inicializar ${deviceId}:`, err);
        updateStatus("Erro na Inicialização");
    });
    updateStatus("Inicializando");
  } catch (error) {
    console.error(`❌ Erro fatal ao configurar cliente ${deviceId}:`, error);
  }
}

io.on("connection", (socket) => {
  console.log("🔌 Nova conexão Socket.IO:", socket.id);
  
  const asClientList = () => Array.from(clients.entries()).map(([id, c]) => ({ id, status: c.status || "Desconectado" }));

  socket.on("authenticate", ({ username, password }) => {
    if (USERS.find((u) => u.username === username && u.password === password)) {
      socket.emit("authenticated", { username });
      socket.emit("client_list", asClientList());
      socket.emit('logics_list', Array.from(loadedLogics.keys()).map(name => ({ name })));
    } else {
      socket.emit("unauthorized");
    }
  });
  
  socket.on('get_log_content', ({ userId, clientId }) => {
    if (!userId || !userId.endsWith('@c.us')) {
      return socket.emit('log_content', { success: false, message: 'ID de usuário inválido.' });
    }
    if (!clientId || !/^[a-zA-Z0-9-]+$/.test(clientId)) {
        return socket.emit('log_content', { success: false, message: 'ID de dispositivo inválido.' });
    }
    const userLogFile = userId.replace('@c.us', '') + '.txt';
    const logFilePath = path.join(process.cwd(), 'conversation_logs', clientId, userLogFile);

    fs.readFile(logFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`Erro ao ler log para ${userId} no dispositivo ${clientId}:`, err.message);
        socket.emit('log_content', { success: false, message: 'Arquivo de log não encontrado. Verifique se a lógica está salvando os arquivos corretamente na pasta do dispositivo.' });
      } else {
        socket.emit('log_content', { success: true, content: data });
      }
    });
  });

  socket.on("get_client_list", () => socket.emit("client_list", asClientList()));
  socket.on("add_client", ({ deviceId }) => {
    if (deviceId && !clients.has(deviceId)) {
        setupWhatsClient(deviceId);
        io.emit("client_list", asClientList());
    }
  });
  socket.on("remove_client", ({ clientId }) => {
    if (clients.has(clientId)) {
      cleanupClient(clientId);
      clients.delete(clientId);
      io.emit("client_list", asClientList());
    }
  });
  socket.on("restart_client", ({ clientId }) => {
    if (clients.has(clientId)) {
      cleanupClient(clientId);
      setTimeout(() => setupWhatsClient(clientId), 1000);
    }
  });
  socket.on("restart_all_clients", () => {
    for (const [clientId] of clients) {
      cleanupClient(clientId);
      setTimeout(() => setupWhatsClient(clientId), 1000);
    }
  });

  socket.on("hard_reset_client", ({ clientId }) => {
    if (clients.has(clientId)) {
        cleanupClient(clientId);
        const sessionPath = path.join(__dirname, '.wwebjs_auth', `session-${clientId}`);
        if (fs.existsSync(sessionPath)) {
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(`✅ Sessão ${clientId} removida com Hard Reset.`);
            } catch (error) {
                console.error(`❌ Erro no Hard Reset ao remover pasta para ${clientId}:`, error);
            }
        }
        setTimeout(() => setupWhatsClient(clientId), 2000);
    }
  });

  socket.on("generate_qr", ({ clientId }) => {
    const client = clients.get(clientId);
    if (client && client.lastQr) {
      socket.emit("qr_code", { clientId, qr: client.lastQr });
    } else if (clients.has(clientId)) {
      cleanupClient(clientId);
      setTimeout(() => setupWhatsClient(clientId), 1000);
    }
  });
  
  socket.on('get_logics_list', () => socket.emit('logics_list', Array.from(loadedLogics.keys()).map(name => ({ name }))));
  socket.on('reload_logics', async () => {
      await loadAllLogics();
      io.emit('logics_list', Array.from(loadedLogics.keys()).map(name => ({ name })));
  });
  
  socket.on('add_logic', async ({ name, code }) => {
      if (!/^[a-zA-Z0-9-]+$/.test(name)) return socket.emit('logic_result', { success: false, message: 'Nome inválido.' });
      const filePath = path.join(logicsDir, `${name}.js`);
      fs.writeFileSync(filePath, code, 'utf8');
      const success = await loadLogic(`${name}.js`);
      if(success) io.emit('logics_list', Array.from(loadedLogics.keys()).map(n => ({ name: n })));
      socket.emit('logic_result', { success, message: success ? 'Lógica salva!' : 'Erro ao carregar lógica.' });
  });

  socket.on('remove_logic', ({ name }) => {
      const filePath = path.join(logicsDir, `${name}.js`);
      if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          loadedLogics.delete(name);
          io.emit('logics_list', Array.from(loadedLogics.keys()).map(n => ({ name: n })));
      }
  });
});

setInterval(() => {
    const allStats = {};
    for (const [deviceId, clientData] of clients.entries()) {
        allStats[deviceId] = {
            messagesToday: clientData.stats.messagesToday,
            activeUsers: clientData.stats.uniqueUsers.size,
            connectedAt: clientData.stats.connectedAt,
        };
    }
    io.emit('update_stats', allStats);
}, 5000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
