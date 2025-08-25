#!/bin/bash
echo "--- INICIANDO LIMPEZA TOTAL ---"
# Parar e deletar qualquer processo do PM2
pm2 stop all || true
pm2 delete all || true
echo "1. Processos PM2 finalizados."

# Matar processos Chrome restantes
pkill -f "chrome" || true
echo "2. Processos Chrome fantasmas finalizados."

# Remover sessões, cache e dependências antigas
echo "3. Removendo arquivos de sessão e dependências..."
rm -rf .wwebjs_auth/
rm -rf .wwebjs_cache/
rm -rf node_modules/
rm -f package-lock.json
echo "   Arquivos antigos removidos."

# Reinstalar dependências do zero
echo "4. Reinstalando dependências (pode demorar)..."
npm install
echo "   Dependências instaladas."

# Iniciar o servidor
echo "5. Iniciando o servidor..."
pm2 start server.js --name chatbot
echo "--- LIMPEZA E REINICIALIZAÇÃO CONCLUÍDAS ---"
echo "Monitore com: pm2 logs chatbot"
