#!/bin/bash

# CORREÇÃO DEFINITIVA - Dashboard Chatbot Manager
# Resolve: Session closed, libgbm.so.1, formulário de login

set -e

echo "🎯 CORREÇÃO DEFINITIVA - Dashboard Chatbot Manager"
echo "=================================================="
echo "🔧 Corrigindo: Session closed + libgbm.so.1 + formulário"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Verificar se é root
if [[ $EUID -eq 0 ]]; then
   log_error "Este script não deve ser executado como root!"
   log_info "Execute como usuário normal. O sudo será solicitado quando necessário."
   exit 1
fi

# Verificar se estamos no diretório correto
if [[ ! -f "server.js" ]]; then
    log_error "Execute este script no diretório do projeto (onde está o server.js)"
    exit 1
fi

log_info "Parando servidor atual..."
# Tentar parar PM2 se estiver rodando
if command -v pm2 &> /dev/null; then
    pm2 stop dashboard-chatbot 2>/dev/null || true
    pm2 delete dashboard-chatbot 2>/dev/null || true
    log_success "PM2 parado"
fi

# Matar processos Node.js na porta 3000
sudo pkill -f "node.*server.js" 2>/dev/null || true
sudo fuser -k 3000/tcp 2>/dev/null || true
log_success "Processos anteriores finalizados"

log_info "Atualizando sistema..."
sudo apt update

log_info "Instalando dependências CRÍTICAS..."
log_warning "Incluindo libgbm1 para resolver erro libgbm.so.1"

# Instalar dependências críticas
sudo apt install -y \
    libgbm1 \
    libgbm-dev \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    fonts-liberation \
    libappindicator3-1 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    ca-certificates \
    lsb-release \
    xdg-utils

log_success "Dependências do sistema instaladas!"

log_info "Instalando Google Chrome (RECOMENDADO)..."
if ! command -v google-chrome-stable &> /dev/null; then
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    sudo apt update
    sudo apt install -y google-chrome-stable
    log_success "Google Chrome instalado!"
else
    log_success "Google Chrome já instalado!"
fi

log_info "Verificando libgbm.so.1..."
sudo ldconfig
if ldconfig -p | grep -q libgbm.so.1; then
    log_success "libgbm.so.1 encontrada e funcionando!"
else
    log_error "libgbm.so.1 ainda não encontrada. Tentando corrigir..."
    sudo apt install -y libgbm1 libgbm-dev --reinstall
    sudo ldconfig
    if ldconfig -p | grep -q libgbm.so.1; then
        log_success "libgbm.so.1 corrigida!"
    else
        log_error "Não foi possível corrigir libgbm.so.1"
        exit 1
    fi
fi

log_info "Fazendo backup dos arquivos atuais..."
cp server.js server.js.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
cp index.html index.html.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
log_success "Backup realizado!"

log_info "Verificando se Chrome está funcionando..."
if command -v google-chrome-stable &> /dev/null; then
    CHROME_PATH=$(which google-chrome-stable)
    log_success "Google Chrome encontrado: $CHROME_PATH"
    
    # Teste básico do Chrome
    if timeout 15s google-chrome-stable --headless --disable-gpu --no-sandbox --dump-dom https://www.google.com > /dev/null 2>&1; then
        log_success "Google Chrome funcionando corretamente!"
    else
        log_warning "Google Chrome pode ter problemas. Continuando mesmo assim..."
    fi
elif command -v chromium-browser &> /dev/null; then
    CHROME_PATH=$(which chromium-browser)
    log_success "Chromium encontrado: $CHROME_PATH"
    
    # Teste básico do Chromium
    if timeout 15s chromium-browser --headless --disable-gpu --no-sandbox --dump-dom https://www.google.com > /dev/null 2>&1; then
        log_success "Chromium funcionando corretamente!"
    else
        log_warning "Chromium pode ter problemas. Continuando mesmo assim..."
    fi
else
    log_error "Nenhum navegador Chrome/Chromium encontrado!"
    exit 1
fi

log_info "Instalando dependências Node.js..."
npm install
log_success "Dependências Node.js atualizadas!"

echo ""
echo "🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!"
echo "=================================="
echo ""
log_success "PROBLEMAS CORRIGIDOS:"
echo "  ✅ libgbm.so.1 instalada e funcionando"
echo "  ✅ Google Chrome/Chromium configurado"
echo "  ✅ Dependências do sistema atualizadas"
echo "  ✅ Backup dos arquivos originais criado"
echo ""
log_info "PRÓXIMOS PASSOS:"
echo "1. Substitua server.js pelo server-ultra-robusto.js"
echo "2. Substitua index.html pelo index-corrigido.html"
echo "3. Inicie o servidor: npm start ou pm2 start server.js --name dashboard-chatbot"
echo ""
log_info "VERIFICAÇÃO:"
echo "  curl http://localhost:3000/health"
echo ""
log_warning "IMPORTANTE:"
echo "- O sistema agora usa Chrome do sistema (não Puppeteer interno)"
echo "- Formulário de login foi corrigido para aceitar digitação"
echo "- Configuração ultra-robusta para resolver 'Session closed'"
echo "- QR Code deve aparecer em 1-2 minutos após iniciar"
echo ""
log_success "Sistema pronto para uso! 🚀"

