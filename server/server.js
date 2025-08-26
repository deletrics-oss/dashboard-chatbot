
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import QRCode from "qrcode";
import { Client, LocalAuth } from "whatsapp-web.js";
import { appendSessionLog, listLogs, readSessionLog, deleteSessionLog } from "./logging.js";
import usersData from "./users.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

// ---- Auth simples ----
const TOKENS = new Set();
function requireAuth(req, res, next){
  const token = req.headers["x-auth"];
  if (!token || !TOKENS.has(token)) return res.status(401).json({ error: "unauthorized" });
  next();
}

app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const ok = (usersData.users||[]).find(u => u.username===username && u.password===password);
  if (!ok) return res.status(401).json({ error:"invalid" });
  const token = Math.random().toString(36).slice(2)+Date.now().toString(36);
  TOKENS.add(token);
  res.json({ token, user: ok.username });
});

// ---- Gerenciador de Dispositivos (múltiplos) ----
const devices = new Map(); // id -> { client, status, qr, me, logic }
const sessionsDir = path.resolve(process.cwd(), "data", "sessions");
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

function logicLoader(logicName){
  const file = path.resolve(process.cwd(), "logics", `${logicName}.js`);
  return import(file).then(m => m.default || m.attach || m).catch(() => null);
}

async function startDevice(id, logicName){
  if (devices.has(id)) return devices.get(id);

  const state = { id, status: "inicializando", qr: "", me: "", logic: logicName || null };
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: id, dataPath: sessionsDir }),
    puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  });

  const io = {
    logSession: (phone, line) => appendSessionLog(phone, `[${id}] ${line}`),
    addEntry: () => {}
  };
  const sessionBag = { }; // por dispositivo

  client.on("qr", async (qr) => {
    state.qr = await QRCode.toDataURL(qr);
    state.status = "qr";
  });
  client.on("ready", async () => {
    state.status = "pronto";
    try { const me = await client.getMe(); state.me = me?.wid?._serialized || ""; } catch {}
  });
  client.on("authenticated", ()=> state.status = "autenticado");
  client.on("auth_failure", ()=> state.status = "falha_autenticacao");
  client.on("disconnected", (r)=> state.status = "desconectado:"+r);

  client.on("message", async (msg) => {
    if (!msg.from?.endsWith("@c.us")) return;
    const phone = msg.from.replace("@c.us","");
    appendSessionLog(phone, `[${id}] USER: ${msg.body}`);
  });

  client.initialize();

  // anexar lógica se existir
  if (logicName) {
    try {
      const fn = await logicLoader(logicName);
      if (typeof fn === "function") fn(client, io, sessionBag, io.addEntry);
    } catch (e) {
      console.error("Falha ao anexar lógica", logicName, e.message);
    }
  }

  state.client = client;
  devices.set(id, state);
  return state;
}

function stopDevice(id, { removeSession=false } = {}){
  const st = devices.get(id);
  if (!st) return false;
  try { st.client?.destroy(); } catch {}
  devices.delete(id);
  if (removeSession){
    const dir = path.join(sessionsDir, `.wwebjs_auth_${id}`);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
  return true;
}

// restaurar dispositivos existentes (pastas de sessão)
for (const name of fs.readdirSync(sessionsDir)) {
  if (name.startsWith(".wwebjs_auth_")) {
    const id = name.replace(".wwebjs_auth_","");
    startDevice(id, null); // sem lógica explícita; o painel pode trocar depois
  }
}

// ---- Rotas de dispositivos ----
app.get("/api/devices", requireAuth, (req, res)=>{
  const list = Array.from(devices.values()).map(d => ({
    id: d.id, status: d.status, me: d.me, hasQR: !!d.qr, logic: d.logic
  }));
  res.json(list);
});

app.post("/api/devices", requireAuth, async (req, res)=>{
  const { id, logic } = req.body || {};
  if (!id) return res.status(400).json({ error: "id required" });
  const state = await startDevice(id, logic || null);
  res.json({ id: state.id, status: state.status, me: state.me, logic: state.logic });
});

app.get("/api/devices/:id/status", requireAuth, (req, res)=>{
  const st = devices.get(req.params.id);
  if (!st) return res.status(404).json({ error: "not found" });
  res.json({ status: st.status, me: st.me, qr: st.qr || null, logic: st.logic });
});

app.post("/api/devices/:id/logic", requireAuth, async (req, res)=>{
  const st = devices.get(req.params.id);
  if (!st) return res.status(404).json({ error: "not found" });
  const { logic } = req.body || {};
  if (!logic) return res.status(400).json({ error: "logic required" });
  try {
    const fn = await logicLoader(logic);
    if (typeof fn !== "function") return res.status(400).json({ error: "logic invalid" });
    const io = {
      logSession: (phone, line) => appendSessionLog(phone, `[${st.id}] ${line}`),
      addEntry: () => {}
    };
    const bag = {};
    fn(st.client, io, bag, io.addEntry);
    st.logic = logic;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/devices/:id", requireAuth, (req, res)=>{
  const { purge } = req.query; // purge=true apaga sessão
  const ok = stopDevice(req.params.id, { removeSession: String(purge).toLowerCase()==="true" });
  if (!ok) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// ---- Logs ----
app.get("/api/logs", requireAuth, (req, res)=> res.json(listLogs()));
app.get("/api/logs/:phone", requireAuth, (req, res)=>{
  res.type("text/plain").send(readSessionLog(req.params.phone));
});
app.delete("/api/logs/:phone", requireAuth, (req, res)=>{
  deleteSessionLog(req.params.phone);
  res.json({ ok: true });
});

// ---- Painel (mantém sua estrutura; você pode usar seu próprio index.html) ----
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const PORT = 3000;
app.listen(PORT, ()=> console.log("Servidor na porta", PORT));
