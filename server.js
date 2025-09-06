```javascript
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { Client, LocalAuth } from "whatsapp-web.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// === Directories and Files ===
const LOGICS_DIR = path.join(__dirname, "logics");
const TRASH_DIR = path.join(LOGICS_DIR, ".trash");
const USERS_FILE = path.join(__dirname, "users.json");

if (!fs.existsSync(LOGICS_DIR)) fs.mkdirSync(LOGICS_DIR, { recursive: true });
if (!fs.existsSync(TRASH_DIR)) fs.mkdirSync(TRASH_DIR, { recursive: true });

// === Users ===
let USERS = [];
if (fs.existsSync(USERS_FILE)) {
  USERS = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
} else {
  USERS = [
    { username: "admin1", password: "suporte@1" },
    { username: "admin2", password: "suporte@1" },
    { username: "admin3", password: "suporte@1" },
    { username: "admin4", password: "suporte@1" },
    { username: "admin5", password: "suporte@1" },
  ];
  fs.writeFileSync(USERS_FILE, JSON.stringify(USERS, null, 2));
}

// === State ===
const clients = new Map(); // deviceId -> { wweb: Client, status, lastQr }
const loadedLogics = new Map(); // name -> { handler, filePath }
const dashboardStats = {
  messagesToday: 0,
  activeUsers: 0,
  uptimeStart: Date.now(),
  messagesByHour: {},
};
const logBuffer = [];
const LOG_BUFFER_MAX = 500;

// === Logging ===
function pushLog(level, msg, meta = {}) {
  const item = { ts: Date.now(), level, msg, meta };
  logBuffer.push(item);
  if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();
  io.emit("log:new", item);
  console.log(`[${level.toUpperCase()}] ${msg}`, meta);
}

// === Metrics ===
function bumpMessagesPerHour(direction = "in", ts = Date.now()) {
  const d = new Date(ts);
  const hourKey = `${d.getHours().toString().padStart(2, "0")}:00`;
  if (!dashboardStats.messagesByHour[hourKey]) {
    dashboardStats.messagesByHour[hourKey] = { countIn: 0, countOut: 0 };
  }
  if (direction === "in") {
    dashboardStats.messagesByHour[hourKey].countIn += 1;
    dashboardStats.messagesToday += 1;
  } else {
    dashboardStats.messagesByHour[hourKey].countOut += 1;
  }
  io.emit("metrics:messages_per_hour", {
    chartLabels: Object.keys(dashboardStats.messagesByHour),
    chartData: Object.values(dashboardStats.messagesByHour).map((h) => h.countIn + h.countOut),
  });
}

// === WhatsApp Client ===
function setupWhatsClient(deviceId) {
  try {
    const wweb = new Client({
      authStrategy: new LocalAuth({ clientId: deviceId }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      },
    });

    clients.set(deviceId, { wweb, status: "QR Code Necessário", lastQr: null });

    wweb.on("qr", (qr) => {
      clients.get(deviceId).lastQr = qr;
      clients.get(deviceId).status = "QR Code Necessário";
      io.emit("qr_code", { clientId: deviceId, qr });
      io.emit("status_change", { clientId: deviceId, status: "QR Code Necessário" });
      io.emit("whatsapp:status", { deviceId, state: "qr", ts: Date.now(), qr });
      pushLog("info", `QR code gerado para ${deviceId}`, { qr });
    });

    wweb.on("ready", () => {
      clients.get(deviceId).status = "Conectado";
      io.emit("status_change", { clientId: deviceId, status: "Conectado" });
      io.emit("whatsapp:status", { deviceId, state: "connected", ts: Date.now() });
      pushLog("info", `WhatsApp conectado para ${deviceId}`);
    });

    wweb.on("authenticated", () => {
      clients.get(deviceId).status = "Conectando…";
      io.emit("status_change", { clientId: deviceId, status: "Conectando…" });
      io.emit("whatsapp:status", { deviceId, state: "connecting", ts: Date.now() });
      pushLog("info", `WhatsApp autenticando para ${deviceId}`);
    });

    wweb.on("disconnected", (reason) => {
      clients.get(deviceId).status = "Desconectado";
      io.emit("status_change", { clientId: deviceId, status: "Desconectado", reason });
      io.emit("whatsapp:status", { deviceId, state: "disconnected", ts: Date.now(), reason });
      pushLog("warn", `WhatsApp desconectado para ${deviceId}`, { reason });
      wweb.initialize().catch((err) => {
        pushLog("error", `Erro ao reinicializar WhatsApp para ${deviceId}`, { error: err.message });
      });
    });

    wweb.on("message", async (msg) => {
      bumpMessagesPerHour("in", msg.timestamp * 1000 || Date.now());
      pushLog("info", `Mensagem recebida [${deviceId}]`, { from: msg.from, body: msg.body });
      io.emit("new_message", {
        clientId: deviceId,
        message: { from: msg.from, body: msg.body, timestamp: Date.now() },
      });

      for (const [name, { handler }] of loadedLogics) {
        try {
          await handler(msg, {
            sendText: async (to, text) => {
              await wweb.sendMessage(to, text);
              pushLog("info", `Mensagem enviada [${deviceId}]`, { to, text });
              bumpMessagesPerHour("out");
            },
            log: (level, msg, meta) => pushLog(level, msg, meta),
          });
        } catch (err) {
          pushLog("error", `Erro na lógica [${deviceId}]: ${name}`, { error: err.message });
        }
      }
    });

    wweb.initialize().catch((err) => {
      pushLog("error", `Erro ao inicializar WhatsApp para ${deviceId}`, { error: err.message });
    });
  } catch (err) {
    pushLog("error", `Erro ao configurar WhatsApp para ${deviceId}`, { error: err.message });
  }
}

// === Logic Loading ===
async function loadLogic(fileName) {
  try {
    const filePath = path.join(LOGICS_DIR, fileName);
    const logicName = path.basename(fileName, ".js");
    const fileUrl = `file://${filePath}?t=${Date.now()}`;
    const module = await import(fileUrl);

    let handler = null;
    const possibleNames = [
      `handle${logicName.charAt(0).toUpperCase() + logicName.slice(1).replace(/-/g, "")}Message`,
      "handleMessage",
      "handle",
    ];

    for (const name of possibleNames) {
      if (typeof module[name] === "function") {
        handler = module[name];
        break;
      }
    }

    if (!handler) {
      const exports = Object.keys(module);
      const firstFunction = exports.find((key) => typeof module[key] === "function");
      if (firstFunction) handler = module[firstFunction];
    }

    if (handler) {
      loadedLogics.set(logicName, { handler, filePath });
      pushLog("info", `Lógica carregada: ${logicName}`);
      return true;
    } else {
      pushLog("warn", `Nenhuma função handler encontrada em ${fileName}`);
      return false;
    }
  } catch (error) {
    pushLog("error", `Erro ao carregar lógica ${fileName}`, { error: error.message });
    return false;
  }
}

async function loadAllLogics() {
  try {
    const files = fs.readdirSync(LOGICS_DIR).filter((file) => file.endsWith(".js"));
    loadedLogics.clear();
    for (const file of files) {
      await loadLogic(file);
    }
    io.emit("logics_list", Array.from(loadedLogics.keys()).map((name) => ({ name })));
    pushLog("info", `${loadedLogics.size} lógicas carregadas`);
    return true;
  } catch (error) {
    pushLog("error", "Erro ao carregar lógicas", { error: error.message });
    return false;
  }
}

async function saveLogic(name, code) {
  try {
    const fileName = `${name}.js`;
    const filePath = path.join(LOGICS_DIR, fileName);
    if (!code.includes("export") || !code.includes("function")) {
      throw new Error("Código deve conter export function");
    }
    fs.writeFileSync(filePath, code, "utf8");
    const success = await loadLogic(fileName);
    if (success) {
      io.emit("logics_list", Array.from(loadedLogics.keys()).map((name) => ({ name })));
      return { success: true, message: "Lógica salva e carregada com sucesso" };
    } else {
      fs.unlinkSync(filePath);
      return { success: false, message: "Erro ao carregar lógica após salvar" };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function removeLogic(name) {
  try {
    const filePath = path.join(LOGICS_DIR, `${name}.js`);
    if (fs.existsSync(filePath)) {
      const trashPath = path.join(TRASH_DIR, `${Date.now()}-${name}.js`);
      fs.renameSync(filePath, trashPath);
      loadedLogics.delete(name);
      io.emit("logics_list", Array.from(loadedLogics.keys()).map((name) => ({ name })));
      pushLog("info", `Lógica movida para lixeira: ${name}`);
      return { success: true, message: "Lógica removida com sucesso" };
    }
    return { success: false, message: "Arquivo de lógica não encontrado" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

fs.watch(LOGICS_DIR, (eventType, filename) => {
  if (filename && filename.endsWith(".js")) {
    pushLog("info", `Mudança detectada em: ${filename}`);
    setTimeout(() => loadAllLogics(), 1000);
  }
});

// === REST Endpoints ===
app.get("/api/status", (req, res) => {
  const uptimeMs = Date.now() - dashboardStats.uptimeStart;
  const mins = Math.floor(uptimeMs / 60000);
  res.json({
    ok: true,
    dashboard: {
      messagesToday: dashboardStats.messagesToday,
      activeUsers: dashboardStats.activeUsers,
      uptime: `${mins}m`,
    },
    clients: Array.from(clients.entries()).map(([id, c]) => ({
      id,
      status: c.status || "Desconectado",
    })),
    logics: Array.from(loadedLogics.keys()).map((name) => ({ name })),
    messagesByHour: dashboardStats.messagesByHour,
  });
});

app.get("/api/logs", (req, res) => {
  const n = Math.min(Number(req.query.n || 200), LOG_BUFFER_MAX);
  res.json(logBuffer.slice(-n));
});

app.get("/api/metrics/messages-per-hour", (req, res) => {
  res.json({
    chartLabels: Object.keys(dashboardStats.messagesByHour),
    chartData: Object.values(dashboardStats.messagesByHour).map((h) => h.countIn + h.countOut),
  });
});

app.get("/api/logics", (req, res) => {
  res.json({ items: Array.from(loadedLogics.keys()).map((name) => ({ name })) });
});

app.post("/api/logics", async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    return res.status(400).json({ success: false, message: "Nome e código são obrigatórios" });
  }
  const result = await saveLogic(name, code);
  res.json(result);
});

app.delete("/api/logics/:name", async (req, res) => {
  const { name } = req.params;
  const result = await removeLogic(name);
  res.json(result);
});

app.post("/api/logics/reload", async (req, res) => {
  const success = await loadAllLogics();
  res.json({ success, message: success ? "Lógicas recarregadas" : "Erro ao recarregar lógicas" });
});

app.post("/api/test/incoming", (req, res) => {
  const { deviceId, message } = req.body;
  if (!deviceId || !clients.has(deviceId)) {
    return res.status(400).json({ error: "deviceId inválido ou não encontrado" });
  }
  const client = clients.get(deviceId);
  client.wweb.emit("message", { ...message, timestamp: Date.now() / 1000 });
  res.json({ ok: true });
});

// === Socket.IO ===
io.on("connection", (socket) => {
  pushLog("info", "Cliente conectado ao socket", { id: socket.id });

  socket.on("authenticate", ({ username, password }) => {
    const user = USERS.find((u) => u.username === username && u.password === password);
    if (!user) {
      socket.emit("unauthorized");
      pushLog("warn", "Tentativa de login falhou", { username });
      return;
    }
    socket.data.username = username;
    dashboardStats.activeUsers = io.sockets.sockets.size;
    socket.emit("authenticated", { username });
    socket.emit("client_list", Array
