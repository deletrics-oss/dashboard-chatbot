
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "whatsapp-web.js";
import QRCode from "qrcode";

const { Client, LocalAuth } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));

// Sessões e logs
const sessionsDir = path.resolve(process.cwd(), "data", "sessions");
const logsDir = path.resolve(process.cwd(), "data", "logs");
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function appendLog(phone, text) {
  const file = path.join(logsDir, `${phone}.log`);
  fs.appendFileSync(file, `[${new Date().toISOString()}] ${text}\n`, "utf8");
}

// Estado de dispositivos
const devices = new Map();

async function startDevice(id, logicName) {
  if (devices.has(id)) return devices.get(id);

  const state = { id, status: "inicializando", qr: "", me: "", logic: logicName || null };
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: id, dataPath: sessionsDir }),
    puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
  });

  client.on("qr", async (qr) => {
    state.qr = await QRCode.toDataURL(qr);
    state.status = "qr";
    io.emit("qr", { id, qr: state.qr });
  });

  client.on("ready", async () => {
    state.status = "pronto";
    try {
      const me = await client.getMe();
      state.me = me?.wid?._serialized || "";
    } catch {}
    io.emit("ready", { id, me: state.me });
  });

  client.on("authenticated", () => {
    state.status = "autenticado";
    io.emit("status", { id, status: state.status });
  });

  client.on("auth_failure", () => {
    state.status = "falha_autenticacao";
    io.emit("status", { id, status: state.status });
  });

  client.on("disconnected", (r) => {
    state.status = "desconectado:" + r;
    io.emit("status", { id, status: state.status });
  });

  client.on("message", async (msg) => {
    if (!msg.from?.endsWith("@c.us")) return;
    const phone = msg.from.replace("@c.us", "");
    appendLog(phone, `[${id}] USER: ${msg.body}`);
  });

  client.initialize();
  state.client = client;
  devices.set(id, state);
  return state;
}

function stopDevice(id, { removeSession=false } = {}) {
  const st = devices.get(id);
  if (!st) return false;
  try { st.client?.destroy(); } catch {}
  devices.delete(id);
  if (removeSession) {
    const dir = path.join(sessionsDir, `.wwebjs_auth_${id}`);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
  return true;
}

// restaurar dispositivos de sessões antigas
for (const name of fs.readdirSync(sessionsDir)) {
  if (name.startsWith(".wwebjs_auth_")) {
    const id = name.replace(".wwebjs_auth_", "");
    startDevice(id, null);
  }
}

// Rotas REST para logs
app.get("/api/logs", (req,res) => {
  const list = fs.readdirSync(logsDir).filter(f=>f.endsWith(".log")).map(f=>f.replace(".log",""));
  res.json(list);
});
app.get("/api/logs/:phone", (req,res) => {
  const file = path.join(logsDir, req.params.phone+".log");
  if (!fs.existsSync(file)) return res.send("");
  res.type("text/plain").send(fs.readFileSync(file,"utf8"));
});

// Painel principal
app.get("/", (req,res) => {
  res.sendFile(path.join(__dirname,"..","public","index.html"));
});

io.on("connection", (socket) => {
  socket.emit("devices", Array.from(devices.values()).map(d => ({
    id: d.id, status: d.status, me: d.me, logic: d.logic
  })));

  socket.on("addDevice", async ({id,logic}) => {
    const st = await startDevice(id, logic||null);
    socket.emit("device", {id:st.id,status:st.status,me:st.me,logic:st.logic});
  });

  socket.on("removeDevice", ({id,purge}) => {
    stopDevice(id, {removeSession:purge});
    socket.emit("removed",{id});
  });

  socket.on("listLogs", ()=>{
    const list = fs.readdirSync(logsDir).filter(f=>f.endsWith(".log")).map(f=>f.replace(".log",""));
    socket.emit("logs", list);
  });
  socket.on("getLog", (phone)=>{
    const file = path.join(logsDir, phone+".log");
    let txt = "";
    if (fs.existsSync(file)) txt = fs.readFileSync(file,"utf8");
    socket.emit("log", {phone,content:txt});
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log("Servidor na porta", PORT));
