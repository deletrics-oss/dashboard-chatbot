// =======================
// Importações
// =======================
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");

// =======================
// Configurações iniciais
// =======================
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// =======================
// Middlewares
// =======================
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =======================
// Logs do Sistema
// =======================
let logs = [];

function addLog(message) {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  const logEntry = `[${timestamp}] ${message}`;
  logs.push(logEntry);
  io.emit("logUpdate", logEntry);
  console.log(logEntry);
}

// =======================
// Rotas principais
// =======================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/logs", (req, res) => {
  res.json(logs);
});

// =======================
// WebSocket
// =======================
io.on("connection", (socket) => {
  addLog("🔌 Novo cliente conectado");

  // Envia os logs atuais para o cliente
  logs.forEach((log) => socket.emit("logUpdate", log));

  socket.on("disconnect", () => {
    addLog("❌ Cliente desconectado");
  });
});

// =======================
// Carregar lógicas
// =======================
const fightArcade = require("./logics/fight-arcade");
fightArcade(io, addLog);

// =======================
// Início do servidor
// =======================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
