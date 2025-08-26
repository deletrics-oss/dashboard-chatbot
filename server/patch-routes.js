// patch-routes.js - rotas extras
import express from "express";
import fs from "fs";
import path from "path";
import { readSessionLog } from "./logging.js";

const router = express.Router();

// Carrega usuários
const users = JSON.parse(fs.readFileSync("./server/users.json", "utf-8")).users;

// Login simples
router.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Credenciais inválidas" });
  res.json({ success: true });
});

// Download de log de sessão
router.get("/api/session-log/:phone", (req, res) => {
  const phone = req.params.phone;
  const log = readSessionLog(phone);
  res.type("text/plain").send(log);
});

// Apagar sessão do WhatsApp
router.delete("/api/device/session", (req, res) => {
  const sessionDir = path.resolve(".wwebjs_auth_fight-arcade");
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    return res.json({ success: true, message: "Sessão apagada." });
  }
  res.json({ success: false, message: "Nenhuma sessão encontrada." });
});

export default router;
