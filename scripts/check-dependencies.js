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

console.log('\n📋 Verificações específicas para WhatsApp Web.js:\n');

// Verificações específicas para Puppeteer/Chrome
const puppeteerChecks = [
    {
        command: 'dpkg -l | grep -E "(libx11|libxss|libgconf|libnss|libxrandr|libasound|libpangocairo|libatk|libcairo|libgtk)" | wc -l',
        description: 'Bibliotecas gráficas necessárias',
        minCount: 5
    }
];

puppeteerChecks.forEach(check => {
    const result = runCommand(check.command, check.description);
    if (result.success) {
        const count = parseInt(result.output);
        if (check.minCount && count < check.minCount) {
            console.log(`⚠️  ${check.description}: Apenas ${count} bibliotecas encontradas (mínimo: ${check.minCount})`);
            allPassed = false;
        }
    }
});

// Verificação de espaço em disco
console.log('\n💾 Verificando recursos do sistema:\n');

const resourceChecks = [
    {
        command: 'df -h / | tail -1 | awk \'{print $4}\'',
        description: 'Espaço livre em disco'
    },
    {
        command: 'free -h | grep Mem | awk \'{print $7}\'',
        description: 'Memória disponível'
    }
];

resourceChecks.forEach(check => {
    runCommand(check.command, check.description);
});

console.log('\n🔧 Instruções de instalação de dependências:\n');

if (!allPassed) {
    console.log('Para instalar as dependências necessárias no Ubuntu 22.04, execute:');
    console.log('');
    console.log('sudo apt update');
    console.log('sudo apt install -y \\');
    console.log('  chromium-browser \\');
    console.log('  libx11-xcb1 \\');
    console.log('  libxcomposite1 \\');
    console.log('  libxcursor1 \\');
    console.log('  libxdamage1 \\');
    console.log('  libxi6 \\');
    console.log('  libxtst6 \\');
    console.log('  libnss3 \\');
    console.log('  libcups2 \\');
    console.log('  libxss1 \\');
    console.log('  libxrandr2 \\');
    console.log('  libasound2 \\');
    console.log('  libpangocairo-1.0-0 \\');
    console.log('  libatk1.0-0 \\');
    console.log('  libcairo-gobject2 \\');
    console.log('  libgtk-3-0 \\');
    console.log('  libgdk-pixbuf2.0-0');
    console.log('');
    console.log('Ou para Google Chrome:');
    console.log('wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -');
    console.log('echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list');
    console.log('sudo apt update');
    console.log('sudo apt install -y google-chrome-stable');
    console.log('');
} else {
    console.log('✅ Todas as dependências estão instaladas!');
}

console.log('📝 Notas importantes:');
console.log('- Certifique-se de que o servidor tem pelo menos 1GB de RAM livre');
console.log('- O WhatsApp Web.js precisa de acesso à internet para funcionar');
console.log('- Em ambientes de produção, considere usar PM2 para gerenciar o processo');
console.log('');

process.exit(allPassed ? 0 : 1);

