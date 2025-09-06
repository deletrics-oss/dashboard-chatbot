/**
 * server.js
 * Backend do dashboard-chatbot com:
 * - Métrica "mensagens por hora" em tempo real
 * - Logs em tempo real (buffer)
 * - Persistência de lógicas em /logics e lixeira /logics/.trash
 * - Endpoints REST para gerenciar lógicas
 * - Eventos de status do WhatsApp para o front sair do "Conectando..."
 *
 * Requisitos (exemplo):
 *   npm i express socket.io cors body-parser
 *
 * OBS: Integração WhatsApp:
 * - Ligue os callbacks do seu adapter (baileys/whatsapp-web.js/venom) em:
 *     setWaStatus('connecting'|'qr'|'connected'|'disconnected'|'error')
 *     onIncomingMessage(message)
 *     sendMessage(chatId, text)
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'DELETE'] },
});

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

// === Pastas ===
const ROOT = __dirname;
const LOGICS_DIR = path.join(ROOT, 'logics');
const TRASH_DIR = path.join(LOGICS_DIR, '.trash');

ensureDir(LOGICS_DIR);
ensureDir(TRASH_DIR);

// === Estado do servidor ===
let waStatus = { state: 'connecting', ts: Date.now(), qr: null }; // connecting|qr|connected|disconnected|error
let logBuffer = []; // {ts, level, msg, meta}
const LOG_BUFFER_MAX = 500;

// Métrica mensagens por hora (janela de 24h)
let hourly = {}; // { hourKey(YYYYMMDDHH): { tsStart, countIn, countOut } }

// Lógicas carregadas
let logicModules = new Map(); // filename.js -> { name, match, handle, description? }

/* ---------------- UTILS ---------------- */
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function pushLog(level, msg, meta = {}) {
  const item = { ts: Date.now(), level, msg, meta };
  logBuffer.push(item);
  if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();
  io.emit('log:new', item);
  // opcional: também escrever em arquivo logs/app.log
}

function setWaStatus(state, extra = {}) {
  waStatus = { state, ts: Date.now(), ...extra };
  io.emit('whatsapp:status', waStatus);
  pushLog('info', `WhatsApp status -> ${state}`, extra);
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
function bumpMessagesPerHour(direction = 'in', ts = Date.now()) {
  const key = hourKey(ts);
  if (!hourly[key]) hourly[key] = { tsStart: hourStart(ts), countIn: 0, countOut: 0 };
  if (direction === 'in') hourly[key].countIn += 1;
  else hourly[key].countOut += 1;
  io.emit('metrics:messages_per_hour', serializeHourly());
}

function serializeHourly() {
  // retorna as últimas 24 horas ordenadas
  const keys = Object.keys(hourly).sort();
  const now = Date.now();
  // opcionalmente, limpar horas antigas
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

/* ------------- CARREGAR LÓGICAS ------------- */
function loadAllLogics() {
  logicModules.clear();
  const files = fs.readdirSync(LOGICS_DIR).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const abs = path.join(LOGICS_DIR, file);
    try {
      delete require.cache[require.resolve(abs)];
      const mod = require(abs);

      // contrato mínimo
      if (typeof mod.handle !== 'function') {
        pushLog('warn', `Lógica ignorada (sem handle): ${file}`);
        continue;
      }
      const name = mod.name || file.replace(/\.js$/, '');
      logicModules.set(file, {
        name,
        match: mod.match || (() => true),
        handle: mod.handle,
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

// carga inicial
loadAllLogics();

/* ------------- ENDPOINTS REST ------------- */
// Status geral
app.get('/api/status', (_req, res) => {
  res.json({ ok: true, waStatus, logics: listLogics(), hourly: serializeHourly() });
});

// Logs (últimos N)
app.get('/api/logs', (req, res) => {
  const n = Math.min(Number(req.query.n || 200), LOG_BUFFER_MAX);
  res.json(logBuffer.slice(-n));
});

// Métrica mensagens por hora
app.get('/api/metrics/messages-per-hour', (_req, res) => {
  res.json(serializeHourly());
});

// Listar lógicas
app.get('/api/logics', (_req, res) => {
  res.json({ items: listLogics() });
});

// Criar/atualizar lógica (JSON: {filename, code})
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

// Remover lógica -> move para lixeira
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

// Restaurar da lixeira
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

// Endpoint de teste para simular entrada de mensagem (útil para debug do gráfico)
app.post('/api/test/incoming', (req, res) => {
  const message = req.body || {};
  onIncomingMessage(message);
  res.json({ ok: true });
});

/* ------------- SOCKET.IO ------------- */
io.on('connection', (socket) => {
  pushLog('info', 'Cliente conectado ao socket', { id: socket.id });
  socket.emit('whatsapp:status', waStatus);
  socket.emit('metrics:messages_per_hour', serializeHourly());
  socket.emit('logics:list', listLogics());
  socket.emit('log:bulk', logBuffer.slice(-200));

  socket.on('disconnect', () => {
    pushLog('info', 'Cliente desconectado do socket', { id: socket.id });
  });
});

/* ------------- INTEGRAÇÃO WHATSAPP (adaptador) ------------- */
/**
 * Conecte seu adapter e chame estes callbacks:
 */

// exemplo: quando o adapter estiver tentando conectar
function waConnecting() {
  setWaStatus('connecting');
}
// quando o adapter gerar QR
function waQr(base64orDataUrl) {
  setWaStatus('qr', { qr: base64orDataUrl });
}
// quando logar
function waConnected() {
  setWaStatus('connected');
}
// quando cair
function waDisconnected() {
  setWaStatus('disconnected');
}
// quando der erro
function waError(err) {
  setWaStatus('error', { error: String(err) });
}

// Chegada de mensagem real
async function onIncomingMessage(message) {
  // message: { from, to, body, ts, ... }
  bumpMessagesPerHour('in', message.ts || Date.now());
  pushLog('info', 'Mensagem recebida', { from: message.from, body: message.body });

  // Executa lógicas em cadeia
  for (const [, mod] of logicModules) {
    try {
      const shouldRun = await Promise.resolve(mod.match(message));
      if (!shouldRun) continue;

      await Promise.resolve(
        mod.handle(message, {
          sendText: async (to, text) => {
            // Conecte aqui no seu adapter real de envio.
            // await adapter.sendMessage(to, text);
            pushLog('info', 'Mensagem enviada', { to, text });
            bumpMessagesPerHour('out', Date.now());
            io.emit('metrics:messages_per_hour', serializeHourly());
          },
          log: (level, msg, meta) => pushLog(level || 'info', msg, meta),
        })
      );
    } catch (err) {
      pushLog('error', `Erro na lógica: ${mod.name}`, { error: String(err) });
    }
  }
}

/* ------------- START ------------- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  pushLog('info', `Servidor iniciado na porta ${PORT}`);
  // Exemplo: se quiser iniciar seu adapter aqui:
  // waConnecting(); initAdapter(); …
});
