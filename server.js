import express from "express";
import http from "http";
import { Server } from "socket.io";
import pkg from "whatsapp-web.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// importar lógicas
import { handleFightArcadeMessage } from "./logics/fight-arcade.js";
import { handleDeliveryPizzariaMessage } from "./logics/delivery-pizzaria.js";

const { Client, LocalAuth } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// servir frontend (public/index.html etc.)
app.use(express.static(path.join(__dirname, "public")));

// === Usuários em arquivo separado (users.json na raiz) ===
const usersFile = path.join(__dirname, "users.json");
let USERS = [];

// Função para carregar usuários com tratamento de erro
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

// === resto do código (igual ao que você já tem) ===
const clients = new Map(); // deviceId -> { wweb:Client, status, lastQr }
const dashboardStats = { messagesToday: 0, activeUsers: 0, uptimeStart: Date.now() };

const asClientList = () =>
  Array.from(clients.entries()).map(([id, c]) => ({ id, status: c.status || "Desconectado" }));

function setupWhatsClient(deviceId) {
  try {
    const wweb = new Client({
      authStrategy: new LocalAuth({ clientId: deviceId }),
      puppeteer: { 
        headless: true, 
        args: [
          "--no-sandbox", 
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu"
        ] 
      },
    });

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
      // Reinicializar após desconexão
      setTimeout(() => {
        console.log(`🔄 Reinicializando cliente ${deviceId}...`);
        wweb.initialize();
      }, 5000);
    });

    wweb.on("message", (msg) => {
      dashboardStats.messagesToday++;
      io.emit("new_message", {
        clientId: deviceId,
        message: { from: msg.from, body: msg.body, timestamp: Date.now() },
      });

      try {
        if (deviceId === "fight-arcade") {
          handleFightArcadeMessage(msg, wweb);
        } else if (deviceId === "delivery-pizzaria") {
          handleDeliveryPizzariaMessage(msg, wweb);
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
    socket.emit("dashboard_data", {
      messagesToday: dashboardStats.messagesToday,
      activeUsers: dashboardStats.activeUsers,
      uptime: `${mins}m`,
      connectionStatus: "—",
      activeUsersList: [],
      chartLabels: [],
      chartData: [],
    });
  });

  socket.on("disconnect", () => {
    console.log("🔌 Conexão Socket.IO desconectada:", socket.id);
  });
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`✅ Servidor rodando em http://${HOST}:${PORT}`);
  console.log(`📊 Dashboard disponível em: http://localhost:${PORT}`);
  console.log(`🕐 Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
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

