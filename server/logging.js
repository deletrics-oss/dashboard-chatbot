// server/logging.js
// Grava logs de sessão por telefone em ./data/logs/<phone>.log
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const LOG_DIR = path.join(DATA_DIR, "logs");

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

export function appendSessionLog(phone, text) {
  try {
    const file = path.join(LOG_DIR, `${phone}.log`);
    const line = `[${new Date().toISOString()}] ${text}\n`;
    fs.appendFileSync(file, line, { encoding: "utf8" });
  } catch (e) {
    console.error("Erro appendSessionLog", e);
  }
}

export function readSessionLog(phone) {
  try {
    const file = path.join(LOG_DIR, `${phone}.log`);
    if (!fs.existsSync(file)) return "";
    return fs.readFileSync(file, "utf8");
  } catch (e) {
    console.error("Erro readSessionLog", e);
    return "";
  }
}
