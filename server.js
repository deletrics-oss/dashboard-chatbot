// server.js - VERSÃO FINAL E COMPLETA
// Inclui: Login seguro com bcrypt, estabilidade de conexão e todas as funcionalidades do painel.

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
const STORAGE_FILE = path.join(__dirname, 'storage.json');

let liveClients = {};
let storage = { users: {} };

// --- FUNÇÕES DE LOG E ARMAZENAMENTO ---
const log = (clientId, message) => {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`[${timestamp}] [${clientId || 'System'}] ${message}`);
};

const saveStorage = () => {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
    } catch (error) {
        log(null, `❌ Erro ao salvar storage: ${error.message}`);
    }
};

const loadStorage = async () => {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            storage = JSON.parse(fs.readFileSync(STORAGE_FILE));
        } else {
            // Se não houver usuários, cria um admin padrão
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin', salt);
            storage = {
                users: {
                    'admin': {
                        password: hashedPassword,
                        devices: []
                    }
                }
            };
            saveStorage();
            log(null, "🔑 Nenhum usuário encontrado. Criado usuário padrão 'admin' com senha 'admin'.");
        }
    } catch (error) {
        log(null, `❌ Erro ao carregar storage: ${error.message}`);
    }
};

// --- GERENCIAMENTO DE PROCESSOS DO CHROME ---
const cleanupChromeProcesses = () => {
    return new Promise(resolve => {
        exec('pkill -f "chrome.*wwebjs" || true', () => resolve());
    });
};

const findChromePath = () => {
    const paths = ['/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser'];
    for (const p of paths) if (fs.existsSync(p)) return p;
    return null;
};

// --- LÓGICA DE CRIAÇÃO E REINÍCIO DE CLIENTES ---
const restartClient = async (username, deviceId) => {
    const clientSession = liveClients[username]?.[deviceId];
    if (!clientSession) return;
    const clientId = clientSession.clientId;

    log(clientId, '🔄 REINICIALIZAÇÃO FORÇADA INICIADA...');
