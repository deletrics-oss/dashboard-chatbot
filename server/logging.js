// logging.js - gerenciamento de logs de sessões
import fs from "fs";
import path from "path";

const logsDir = path.resolve("./data/logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

export function appendSessionLog(user, line) {
  const logfile = path.join(logsDir, `${user}.log`);
  const entry = `[${new Date().toISOString()}] ${line}\n`;
  fs.appendFileSync(logfile, entry, "utf-8");
}

export function readSessionLog(user) {
  const logfile = path.join(logsDir, `${user}.log`);
  if (!fs.existsSync(logfile)) return "";
  return fs.readFileSync(logfile, "utf-8");
}
