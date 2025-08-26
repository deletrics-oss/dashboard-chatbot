
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const LOG_DIR = path.join(DATA_DIR, "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

export function appendSessionLog(phone, text) {
  try {
    const file = path.join(LOG_DIR, `${phone}.log`);
    fs.appendFileSync(file, `[${new Date().toISOString()}] ${text}\n`, "utf8");
  } catch (e) { console.error("appendSessionLog", e.message); }
}

export function listLogs() {
  try { return fs.readdirSync(LOG_DIR).filter(f=>f.endsWith(".log")).map(f=>f.replace(".log","")); }
  catch { return []; }
}

export function readSessionLog(phone) {
  try {
    const file = path.join(LOG_DIR, `${phone}.log`);
    if (!fs.existsSync(file)) return "";
    return fs.readFileSync(file, "utf8");
  } catch { return ""; }
}

export function deleteSessionLog(phone) {
  try {
    const file = path.join(LOG_DIR, `${phone}.log`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return true;
  } catch { return false; }
}
