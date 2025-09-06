/**
 * logics/fight-arcade.js
 * Exemplo de lógica persistente para FightArcade.
 * - Mantida em arquivo físico (não some ao reiniciar)
 * - Carregada automaticamente por server.js
 * - Contrato: exporta { name, description?, match(message), handle(message, {sendText, log}) }
 */

module.exports.name = 'FightArcade';
module.exports.description = 'Atende clientes interessados nos fliperamas FightArcade e envia fluxos básicos.';

/**
 * Decide quando essa lógica deve rodar.
 * Retorne true para rodar sempre, ou aplique filtros.
 */
module.exports.match = (message) => {
  if (!message || !message.body) return false;
  const text = String(message.body).toLowerCase();
  // ativa se o usuário falar termos de interesse
  return /fight\s*arcade|fliperama|arcade|controles? de luta|stick|cabine/.test(text);
};

/**
 * Handler principal.
 * `helpers.sendText(to, text)` envia mensagem (o server já contabiliza métrica e log).
 */
module.exports.handle = async (message, helpers) => {
  const to = message.from; // ajuste conforme seu adapter (às vezes é message.chatId)
  const text = String(message.body || '').trim().toLowerCase();

  // Fluxo simples de exemplo (substitua pelo seu fluxo completo)
  if (/pre(ç|c)o|valor|quanto/.test(text)) {
    await helpers.sendText(to,
      '💥 *FightArcade* — Tabela Express:\n' +
      '• Kit básico (PS/PC): R$ 399\n' +
      '• Kit Pro Sanwa: R$ 749\n' +
      '• Gabinete completo: a partir de R$ 2990\n' +
      'Me diga seu console e quantos botões você precisa que eu já recomendo o ideal.'
    );
    return;
  }

  if (/frete|envio|entrega/.test(text)) {
    await helpers.sendText(to,
      '🚚 Enviamos para todo o Brasil via Correios/Jadlog. Informando seu CEP eu já simulo o frete aqui.'
    );
    return;
  }

  if (/montagem|instala(ç|c)ão|como funciona/.test(text)) {
    await helpers.sendText(to,
      '🛠️ A montagem é simples. Enviamos manual e vídeo. Se quiser, temos opção plug-and-play já configurado.'
    );
    return;
  }

  // fallback (primeiro contato)
  await helpers.sendText(to,
    '👋 Olá! Eu sou o assistente da *FightArcade*.\n' +
    'Posso ajudar com preços, recomendações de kit, frete e prazos. Sobre o que você quer saber?'
  );
};
