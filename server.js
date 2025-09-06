/**
 * server.js
 * Backend do dashboard-chatbot com:
 * - Métrica "mensagens por hora" em tempo real
 * - Logs em tempo real (buffer)
 * - Persistência de lógicas em /logics e lixeira /logics/.trash
 * - Endpoints REST para gerenciar lógicas
 * - Eventos de status do WhatsApp para o front sair do "Conectando..."
 * - Integração com whatsapp-web.js para QR code e mensagens
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Configuração do Express e Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'DELETE'] },
});

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public'))); // Servir frontend

// === Pastas ===
const ROOT = __dirname;
const LOGICS_DIR = path.join(ROOT, 'logics');
const TRASH_DIR = path.join(LOGICS_DIR, '.trash');
const USERS_FILE = path.join(ROOT, 'users.json');

ensureDir(LOGICS_DIR);
ensureDir(TRASH_DIR);

// === Usuários ===
let USERS = [];
if (fs.existsSync(USERS_FILE)) {
  USERS = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
} else {
  USERS = [
    { username: 'admin1', password: 'suporte@1' },
    { username: 'admin2', password: 'suporte@1' },
    { username: 'admin3', password: 'suporte@1' },
    { username: 'admin4', password: 'suporte@1' },
    { username: 'admin5', password: 'suporte@1' },
  ];
  fs.writeFileSync(USERS_FILE, JSON.stringify(USERS, null, 2));
}

// === Estado do servidor ===
const clients = new Map(); // deviceId -> { wweb: Client, status, lastQr }
let waStatus = { state: 'disconnected', ts: Date.now(), qr: null }; // connecting|qr|connected|disconnected|error
let logBuffer = []; // {ts, level, msg, meta}
const LOG_BUFFER_MAX = 500;
let hourly = {}; // { hourKey(YYYYMMDDHH): { tsStart, countIn, countOut } }
let logicModules = new Map(); // filename.js -> { name, match, handle, description? }
const dashboardStats = { messagesToday: 0, activeUsers: 0, uptimeStart: Date.now() };

/* ---------------- UTILS ---------------- */
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function pushLog(level, msg, meta = {}) {
  const item = { ts: Date.now(), level, msg, meta };
  logBuffer.push(item);
  if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();
  io.emit('log:new', item);
}

function setWaStatus(deviceId, state, extra = {}) {
  waStatus = { deviceId, state, ts: Date.now(), ...extra };
  io.emit('whatsapp:status', waStatus);
  io.emit('status_change', { clientId: deviceId, status: state }); // Compatibilidade com index.html
  pushLog('info', `WhatsApp status [${deviceId}] -> ${state}`, extra);
}

function hourKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const h = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  return `${y}${m}${h}${hh}`;
}

function hourStart(ts = Date.now()) {
  const d = new Date(ts);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

function bumpMessagesPerHour(deviceId, direction = 'in', ts = Date.now()) {
  const key = hourKey(ts);
  if (!hourly[key]) hourly[key] = { tsStart: hourStart(ts), countIn: 0, countOut: 0 };
  if (direction === 'in') hourly[key].countIn += 1;
  else hourly[key].countOut += 1;
  dashboardStats.messagesToday += 1;
  io.emit('metrics:messages_per_hour', serializeHourly());
}

function serializeHourly() {
  const keys = Object.keys(hourly).sort();
  const now = Date.now();
  const keep = {};
  for (let k of keys) {
    if (now - hourly[k].tsStart <= 24 * 3600 * 1000) keep[k] = hourly[k];
  }
  hourly = keep;

  const arr = Object.entries(hourly)
    .sort((a, b) => a[1].tsStart - b[1].tsStart)
    .map(([k, v]) => ({
      hourKey: k,
      tsStart: v.tsStart,
      countIn: v.countIn,
      countOut: v.countOut,
      total: v.countIn + v.countOut,
    }));
  return arr;
}

function asClientList() {
  return Array.from(clients.entries()).map(([id, c]) => ({
    id,
    status: c.status || 'Desconectado',
  }));
}

/* ------------- CARREGAR LÓGICAS ------------- */
function loadAllLogics() {
  logicModules.clear();
  const files = fs.readdirSync(LOGICS_DIR).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const abs = path.join(LOGICS_DIR, file);
    try {
      delete require.cache[require.resolve(abs)];
      const mod = require(abs);

      if (typeof mod.handle !== 'function' && typeof mod.handleMessage !== 'function') {
        pushLog('warn', `Lógica ignorada (sem handle/handleMessage): ${file}`);
        continue;
      }
      const name = mod.name || file.replace(/\.js$/, '');
      logicModules.set(file, {
        name,
        match: mod.match || (() => true),
        handle: mod.handle || mod.handleMessage,
        description: mod.description || '',
      });
      pushLog('info', `Lógica carregada: ${file}`, { name });
    } catch (err) {
      pushLog('error', `Falha ao carregar lógica: ${file}`, { error: String(err) });
    }
  }
  io.emit('logics:list', listLogics());
}

function listLogics() {
  return Array.from(logicModules.entries()).map(([file, mod]) => ({
    file,
    name: mod.name,
    description: mod.description || '',
  }));
}

// Carga inicial
loadAllLogics();

/* ------------- WHATSAPP CLIENT ------------- */
function setupWhatsClient(deviceId) {
  const wweb = new Client({
    authStrategy: new LocalAuth({ clientId: deviceId }),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
  });

  clients.set(deviceId, { wweb, status: 'QR Code Necessário', lastQr: null });

  wweb.on('qr', (qr) => {
    clients.get(deviceId).lastQr = qr;
    clients.get(deviceId).status = 'QR Code Necessário';
    setWaStatus(deviceId, 'qr', { qr });
    io.emit('qr_code', { clientId: deviceId, qr }); // Compatibilidade com index.html
  });

  wweb.on('ready', () => {
    clients.get(deviceId).status = 'Conectado';
    setWaStatus(deviceId, 'connected');
  });

  wweb.on('authenticated', () => {
    clients.get(deviceId).status = 'Conectando…';
    setWaStatus(deviceId, 'connecting');
  });

  wweb.on('disconnected', (reason) => {
    clients.get(deviceId).status = 'Desconectado';
    setWaStatus(deviceId, 'disconnected', { reason });
    wweb.initialize(); // Tentar reconectar
  });

  wweb.on('message', async (msg) => {
    dashboardStats.messagesToday++;
    bumpMessagesPerHour(deviceId, 'in', msg.timestamp * 1000 || Date.now());
    pushLog('info', `Mensagem recebida [${deviceId}]`, { from: msg.from, body: msg.body });
    io.emit('new_message', {
      clientId: deviceId,
      message: { from: msg.from, body: msg.body, timestamp: Date.now() },
    });

    // Executar lógicas dinâmicas
    for (const [, mod] of logicModules) {
      try {
        const shouldRun = await Promise.resolve(mod.match(msg));
        if (!shouldRun) continue;

        await Promise.resolve(
          mod.handle(msg, {
            sendText: async (to, text) => {
              await wweb.sendMessage(to, text);
              pushLog('info', `Mensagem enviada [${deviceId}]`, { to, text });
              bumpMessagesPerHour(deviceId, 'out', Date.now());
              io.emit('metrics:messages_per_hour', serializeHourly());
            },
            log: (level, msg, meta) => pushLog(level || 'info', msg, meta),
          })
        );
      } catch (err) {
        pushLog('error', `Erro na lógica [${deviceId}]: ${mod.name}`, { error: String(err) });
      }
    }
  });

  wweb.initialize();
}

/* ------------- ENDPOINTS REST ------------- */
app.get('/api/status', (_req, res) => {
  const uptimeMs = Date.now() - dashboardStats.uptimeStart;
  const mins = Math.floor(uptimeMs / 60000);
  res.json({
    ok: true,
    waStatus,
    logics: listLogics(),
    hourly: serializeHourly(),
    dashboard: {
      messagesToday: dashboardStats.messagesToday,
      activeUsers: dashboardStats.activeUsers,
      uptime: `${mins}m`,
    },
    clients: asClientList(),
  });
});

app.get('/api/logs', (req, res) => {
  const n = Math.min(Number(req.query.n || 200), LOG_BUFFER_MAX);
  res.json(logBuffer.slice(-n));
});

app.get('/api/metrics/messages-per-hour', (_req, res) => {
  res.json(serializeHourly());
});

app.get('/api/logics', (_req, res) => {
  res.json({ items: listLogics() });
});

app.post('/api/logics', (req, res) => {
  const { filename, code } = req.body || {};
  if (!filename || !/^[a-zA-Z0-9._-]+\.js$/.test(filename)) {
    return res.status(400).json({ error: 'filename inválido. Ex: minha-logica.js' });
  }
  if (typeof code !== 'string' || !code.length) {
    return res.status(400).json({ error: 'code vazio' });
  }
  const abs = path.join(LOGICS_DIR, filename);
  fs.writeFileSync(abs, code, 'utf8');
  pushLog('info', `Lógica salva: ${filename}`);
  loadAllLogics();
  res.json({ ok: true });
});

app.delete('/api/logics/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!/^[a-zA-Z0-9._-]+\.js$/.test(filename)) {
    return res.status(400).json({ error: 'filename inválido' });
  }
  const src = path.join(LOGICS_DIR, filename);
  if (!fs.existsSync(src)) return res.status(404).json({ error: 'não encontrada' });
  const dst = path.join(TRASH_DIR, `${Date.now()}-${filename}`);
  fs.renameSync(src, dst);
  pushLog('info', `Lógica movida para lixeira: ${filename}`, { dst: path.basename(dst) });
  loadAllLogics();
  res.json({ ok: true });
});

app.post('/api/logics/restore/:trashName', (req, res) => {
  const trashName = req.params.trashName;
  if (!trashName) return res.status(400).json({ error: 'trashName obrigatório' });
  const src = path.join(TRASH_DIR, trashName);
  if (!fs.existsSync(src)) return res.status(404).json({ error: 'não encontrada na lixeira' });
  const original = trashName.replace(/^\d+-/, '');
  const dst = path.join(LOGICS_DIR, original);
  fs.renameSync(src, dst);
  pushLog('info', `Lógica restaurada da lixeira: ${original}`);
  loadAllLogics();
  res.json({ ok: true });
});

app.post('/api/test/incoming', (req, res) => {
  const { deviceId, message } = req.body || {};
  if (!deviceId || !clients.has(deviceId)) {
    return res.status(400).json({ error: 'deviceId inválido ou não encontrado' });
  }
  onIncomingMessage(deviceId, message);
  res.json({ ok: true });
});

/* ------------- SOCKET.IO ------------- */
io.on('connection', (socket) => {
  pushLog('info', 'Cliente conectado ao socket', { id: socket.id });

  // Autenticação
  socket.on('authenticate', ({ username, password }) => {
    const user = USERS.find(u => u.username === username && u.password === password);
    if (!user) {
      socket.emit('unauthorized');
      pushLog('warn', 'Tentativa de login falhou', { username });
      return;
    }
    socket.data.username = username;
    dashboardStats.activeUsers = io.sockets.sockets.size;
    socket.emit('authenticated', { username });
    socket.emit('client_list', asClientList());
    socket.emit('whatsapp:status', waStatus);
    socket.emit('metrics:messages_per_hour', serializeHourly());
    socket.emit('logics:list', listLogics());
    socket.emit('log:bulk', logBuffer.slice(-200));
    socket.emit('dashboard_data', {
      messagesToday: dashboardStats.messagesToday,
      activeUsers: dashboardStats.activeUsers,
      uptime: `${Math.floor((Date.now() - dashboardStats.uptimeStart) / 60000)}m`,
      connectionStatus: waStatus.state,
      activeUsersList: [],
      chartLabels: serializeHourly().map(h => h.hourKey),
      chartData: serializeHourly().map(h => h.total),
    });
    pushLog('info', 'Usuário autenticado', { username });
  });

  socket.on('get_client_list', () => {
    socket.emit('client_list', asClientList());
  });

  socket.on('add_client', ({ deviceId }) => {
    if (!deviceId) return;
    if (!clients.has(deviceId)) {
      setupWhatsClient(deviceId);
      pushLog('info', `Novo cliente WhatsApp adicionado: ${deviceId}`);
    }
    io.emit('client_list', asClientList());
  });

  socket.on('select_client', ({ clientId }) => {
    const entry = clients.get(clientId);
    if (!entry) return;
    socket.emit('status_change', { clientId, status: entry.status || 'Desconectado' });
    if (entry.lastQr) socket.emit('qr_code', { clientId, qr: entry.lastQr });
    socket.emit('whatsapp:status', { ...waStatus, deviceId: clientId });
  });

  socket.on('generate_qr', ({ clientId }) => {
    const entry = clients.get(clientId);
    if (!entry) return;
    if (entry.lastQr) {
      socket.emit('qr_code', { clientId, qr: entry.lastQr });
      setWaStatus(clientId, 'qr', { qr: entry.lastQr });
    } else {
      entry.wweb.initialize(); // Forçar nova inicialização
    }
  });

  socket.on('get_dashboard_data', () => {
    const uptimeMs = Date.now() - dashboardStats.uptimeStart;
    const mins = Math.floor(uptimeMs / 60000);
    socket.emit('dashboard_data', {
      messagesToday: dashboardStats.messagesToday,
      activeUsers: dashboardStats.activeUsers,
      uptime: `${mins}m`,
      connectionStatus: waStatus.state,
      activeUsersList: [],
      chartLabels: serializeHourly().map(h => h.hourKey),
      chartData: serializeHourly().map(h => h.total),
    });
  });

  socket.on('disconnect', () => {
    dashboardStats.activeUsers = io.sockets.sockets.size;
    pushLog('info', 'Cliente desconectado do socket', { id: socket.id });
  });
});

/* ------------- INTEGRAÇÃO WHATSAPP ------------- */
async function onIncomingMessage(deviceId, message) {
  // Já tratado no wweb.on('message') do setupWhatsClient
}

/* ------------- START ------------- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  pushLog('info', `Servidor iniciado na porta ${PORT}`);
});
