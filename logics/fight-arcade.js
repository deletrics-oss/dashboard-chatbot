/**
 * Lógica para o bot Fight Arcade
 */

export function handleFightArcadeMessage(msg, wweb) {
  try {
    console.log(`🎮 Fight Arcade - Nova mensagem de ${msg.from}: ${msg.body}`);
    
    // Aqui você pode adicionar a lógica específica do Fight Arcade
    // Por exemplo:
    
    const messageBody = msg.body.toLowerCase().trim();
    
    if (messageBody === 'oi' || messageBody === 'olá' || messageBody === 'hello') {
      msg.reply('🎮 Bem-vindo ao Fight Arcade! Como posso ajudar?');
    } else if (messageBody.includes('horário') || messageBody.includes('horario')) {
      msg.reply('🕐 Nosso horário de funcionamento é de segunda a domingo, das 10h às 22h!');
    } else if (messageBody.includes('preço') || messageBody.includes('preco')) {
      msg.reply('💰 Consulte nossos preços e promoções! Entre em contato para mais informações.');
    } else {
      // Resposta padrão para mensagens não reconhecidas
      console.log(`🎮 Fight Arcade - Mensagem não reconhecida: ${msg.body}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no handleFightArcadeMessage:', error.message);
  }
}

