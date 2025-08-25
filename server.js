// server.js - VERSÃO DE TESTE MÍNIMA
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');

console.log('[SISTEMA] Iniciando...');

// Função para encontrar o Chrome
const findChromePath = () => {
    const paths = ['/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser'];
    for (const p of paths) {
        if (fs.existsSync(p)) {
            console.log(`[CHROME] Encontrado em: ${p}`);
            return p;
        }
    }
    return null;
};

const chromePath = findChromePath();
if (!chromePath) {
    console.error('[ERRO] Google Chrome não encontrado! Abortando.');
    process.exit(1);
}

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'minha-sessao-unica' }),
    puppeteer: {
        headless: true,
        executablePath: chromePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ]
    }
});

console.log('[CLIENTE] Instância criada. Adicionando eventos...');

client.on('qr', (qr) => {
    console.log('[EVENTO] QR Code recebido! Gere o QR Code a partir deste texto:');
    console.log(qr);
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('[ERRO] Falha ao gerar imagem do QR Code.');
            return;
        }
        console.log('[QRCODE] Imagem gerada. Salva como qr.png e disponível em /qr.html');
        // Cria um HTML simples para exibir o QR Code
        fs.writeFileSync('./qr.html', `<img src="${url}">`);
        fs.writeFileSync('./qr.png', url.split(',')[1], 'base64');
    });
});

client.on('ready', () => {
    console.log('[EVENTO] Cliente está pronto! CONECTADO!');
});

client.on('disconnected', (reason) => {
    console.log('[EVENTO] Cliente foi desconectado!', reason);
    // Em caso de desconexão, encerra o processo para o PM2 reiniciar.
    process.exit(1);
});

client.on('auth_failure', (msg) => {
    console.error('[EVENTO] Falha na autenticação!', msg);
    process.exit(1);
});

client.on('message', msg => {
    console.log(`[MENSAGEM] de ${msg.from}: ${msg.body}`);
    if (msg.body.toLowerCase() === 'ping') {
        msg.reply('pong');
    }
});

console.log('[SISTEMA] Inicializando cliente...');

client.initialize().catch(err => {
    console.error('[ERRO FATAL] Falha ao inicializar o cliente:', err);
    process.exit(1); // Força o encerramento em caso de erro
});
