import express from "express";
import http from "http";
import { Server } from "socket.io";
import pkg from "whatsapp-web.js";   // ✅ Import corrigido (CommonJS → ESM)
import path from "path";
import { fileURLToPath } from "url";

// importar as lógicas personalizadas
import { handleFightArcadeMessage } from "./logics/fight-arcade.js";
import { handleDeliveryPizzariaMessage } from "./logics/delivery-pizzaria.js";

// extrair Client e LocalAuth de whatsapp-web.js
const { Client, LocalAuth } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// servir os arquivos estáticos (dashboard)
app.use(express.static(path.join(__dirname, "public")));

// login simples
const USERS = [{ username: "admin1", password: "suporte@1" }];

// estado global
const clients = new Map(); // deviceId -> { wweb:Client, status, lastQr }
const dashboardStats = { messagesToday: 0, activeUsers: 0, uptimeStart: Date.now() };

const asClientList = () =>
  Array.from(clients.entries()).map(([id, c]) => ({ id, status: c.status || "Desconectado" }));

function setupWhatsClient(deviceId) {
  const wweb = new Client({
    authStrategy: new LocalAuth({ clientId: deviceId }),
    puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  });

  clients.set(deviceId, { wweb, status: "QR Code Necessário", lastQr: null });

  wweb.on("qr", (qr) => {
    clients.get(deviceId).lastQr = qr;
    clients.get(deviceId).status = "QR Code Necessário";
    io.emit("qr_code", { clientId: deviceId, qr });
    io.emit("status_change", { clientId: deviceId, status: "QR Code Necessário" });
  });

  wweb.on("ready", () => {
    clients.get(deviceId).status = "Conectado";
    io.emit("status_change", { clientId: deviceId, status: "Conectado" });
  });

  wweb.on("authenticated", () => {
    clients.get(deviceId).status = "Conectando…";
    io.emit("status_change", { clientId: deviceId, status: "Conectando…" });
  });

  wweb.on("disconnected", (reason) => {
    clients.get(deviceId).status = "Desconectado";
    io.emit("status_change", { clientId: deviceId, status: "Desconectado", reason });
    wweb.initialize(); // tenta reconectar
  });

  wweb.on("message", (msg) => {
    dashboardStats.messagesToday++;
    io.emit("new_message", {
      clientId: deviceId,
      message: { from: msg.from, body: msg.body, timestamp: Date.now() },
    });

    // encaminhar para a lógica certa
    if (deviceId === "fight-arcade") {
      handleFightArcadeMessage(msg, wweb);
    } else if (deviceId === "delivery-pizzaria") {
      handleDeliveryPizzariaMessage(msg, wweb);
    }
  });

  wweb.initialize();
}

io.on("connection", (socket) => {
  // autenticação
  socket.on("authenticate", ({ username, password }) => {
    const ok = USERS.find((u) => u.username === username && u.password === password);
    if (!ok) return socket.emit("unauthorized");
    socket.data.username = username;
    socket.emit("authenticated", { username });
    socket.emit("client_list", asClientList());
  });

  socket.on("get_client_list", () => socket.emit("client_list", asClientList()));

  socket.on("add_client", ({ deviceId }) => {
    if (!deviceId) return;
    if (!clients.has(deviceId)) setupWhatsClient(deviceId);
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
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("✅ Servidor rodando em http://localhost:" + PORT));
