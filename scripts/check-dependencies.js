#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Verificando dependências do sistema...\n');

// Função para executar comandos e capturar saída
function runCommand(command, description) {
    try {
        const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        console.log(`✅ ${description}: OK`);
        return { success: true, output: output.trim() };
    } catch (error) {
        console.log(`❌ ${description}: FALHOU`);
        console.log(`   Erro: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Verificações do sistema
const checks = [
    {
        command: 'node --version',
        description: 'Node.js instalado'
    },
    {
        command: 'npm --version',
        description: 'NPM instalado'
    },
    {
        command: 'which google-chrome || which chromium-browser || which chromium',
        description: 'Chrome/Chromium instalado'
    },
    {
        command: 'ldd --version',
        description: 'Bibliotecas do sistema'
    }
];

let allPassed = true;

checks.forEach(check => {
    const result = runCommand(check.command, check.description);
    if (!result.success) {
        allPassed = false;
    }
});

// (Restante das verificações, como bibliotecas gráficas e recursos do sistema, como no original.)
