const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const LOGICS_DIR = path.join(__dirname, 'logics');
const TRASH_DIR = path.join(__dirname, 'trash');

if (!fs.existsSync(LOGICS_DIR)) fs.mkdirSync(LOGICS_DIR);
if (!fs.existsSync(TRASH_DIR)) fs.mkdirSync(TRASH_DIR);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let logs = [];
function addLog(level, msg) {
  const item = { ts: Date.now(), level, msg };
  logs.push(item);
  if (logs.length > 200) logs.shift();
  io.emit('log:new', item);
}
app.get('/api/logs', (req, res) => res.json({ items: logs }));

// ==== Lógicas ====
function listLogics() {
  return fs.readdirSync(LOGICS_DIR).filter(f => f.endsWith('.js')).map(f => ({
    file: f,
    name: f.replace('.js', '')
  }));
}
app.get('/api/logics', (req, res) => res.json({ items: listLogics() }));
app.delete('/api/logics/:file', (req, res) => {
  const f = req.params.file;
  const src = path.join(LOGICS_DIR, f);
  const dest = path.join(TRASH_DIR, f);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    addLog("info", `Lógica ${f} movida para lixeira`);
  }
  res.json({ ok: true });
});
app.get('/api/logics/trash', (req, res) => {
  const items = fs.readdirSync(TRASH_DIR).filter(f => f.endsWith('.js'));
  res.json({ items });
});
app.post('/api/logics/restore/:file', (req, res) => {
  const f = req.params.file;
  const src = path.join(TRASH_DIR, f);
  const dest = path.join(LOGICS_DIR, f);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    addLog("info", `Lógica ${f} restaurada da lixeira`);
  }
  res.json({ ok: true });
});

// ==== Socket ====
io.on('connection', (socket) => {
  socket.emit('log:bulk', logs);
  socket.emit('logics:list', listLogics());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
