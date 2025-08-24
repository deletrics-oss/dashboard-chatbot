#!/bin/bash

# CORREÇÃO URGENTE - Resolve Session closed + SingletonLock
# Baseado na análise dos logs do usuário

set -e

echo "🚨 CORREÇÃO URGENTE - Problemas Identificados nos Logs"
echo "======================================================"
echo "🔧 Resolvendo: Session closed + SingletonLock + múltiplas instâncias"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

log_info "Parando TODOS os processos PM2..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

log_info "Matando processos Chrome/Chromium restantes..."
sudo pkill -f chrome 2>/dev/null || true
sudo pkill -f chromium 2>/dev/null || true
sleep 3

log_info "Limpando arquivos de sessão problemáticos..."
if [ -d ".wwebjs_auth" ]; then
    log_warning "Removendo diretório .wwebjs_auth (sessões corrompidas)"
    rm -rf .wwebjs_auth
    log_success "Sessões antigas removidas!"
fi

if [ -d ".wwebjs_cache" ]; then
    log_warning "Removendo cache do WhatsApp Web"
    rm -rf .wwebjs_cache
    log_success "Cache removido!"
fi

log_info "Limpando arquivos temporários do Chrome..."
sudo rm -rf /tmp/.com.google.Chrome.* 2>/dev/null || true
sudo rm -rf /tmp/chrome_* 2>/dev/null || true
sudo rm -rf /tmp/.org.chromium.Chromium.* 2>/dev/null || true

log_info "Verificando espaço em disco..."
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    log_warning "Disco com ${DISK_USAGE}% de uso. Limpando arquivos temporários..."
    sudo apt clean
    sudo rm -rf /tmp/* 2>/dev/null || true
    sudo rm -rf /var/tmp/* 2>/dev/null || true
fi

log_info "Verificando memória disponível..."
FREE_MEM=$(free -m | grep '^Mem:' | awk '{print $7}')
if [ "$FREE_MEM" -lt 500 ]; then
    log_warning "Pouca memória livre (${FREE_MEM}MB). Limpando cache..."
    sudo sync
    sudo echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
fi

log_info "Verificando se Chrome está funcionando..."
if timeout 10s google-chrome-stable --headless --disable-gpu --no-sandbox --dump-dom https://www.google.com > /dev/null 2>&1; then
    log_success "Chrome funcionando corretamente!"
else
    log_warning "Chrome pode ter problemas. Reinstalando..."
    sudo apt update
    sudo apt install -y google-chrome-stable --reinstall
fi

log_info "Criando diretórios necessários..."
mkdir -p logs
mkdir -p .wwebjs_auth
chmod 755 .wwebjs_auth

log_success "Limpeza completa realizada!"
echo ""
log_info "PRÓXIMOS PASSOS:"
echo "1. Substitua o server.js pelo server-ultra-corrigido.js"
echo "2. Execute: pm2 start server.js --name chatbot"
echo "3. Monitore: pm2 logs chatbot"
echo ""
log_warning "IMPORTANTE:"
echo "- Sessões antigas foram removidas (precisará escanear QR novamente)"
echo "- Sistema agora evita conflitos de múltiplas instâncias"
echo "- Configuração otimizada para resolver 'Session closed'"

