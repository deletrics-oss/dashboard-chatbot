/**
 * Lógica para o bot Delivery Pizzaria
 */

export function handleDeliveryPizzariaMessage(msg, wweb) {
  try {
    console.log(`🍕 Delivery Pizzaria - Nova mensagem de ${msg.from}: ${msg.body}`);
    
    // Aqui você pode adicionar a lógica específica da Pizzaria
    // Por exemplo:
    
    const messageBody = msg.body.toLowerCase().trim();
    
    if (messageBody === 'oi' || messageBody === 'olá' || messageBody === 'hello') {
      msg.reply('🍕 Bem-vindo à nossa Pizzaria! Confira nosso cardápio e faça seu pedido!');
    } else if (messageBody.includes('cardápio') || messageBody.includes('cardapio') || messageBody.includes('menu')) {
      msg.reply('📋 Nosso cardápio:\n🍕 Pizza Margherita - R$ 25,00\n🍕 Pizza Calabresa - R$ 28,00\n🍕 Pizza Portuguesa - R$ 30,00\n\nDigite o nome da pizza para fazer seu pedido!');
    } else if (messageBody.includes('horário') || messageBody.includes('horario')) {
      msg.reply('🕐 Funcionamos de terça a domingo, das 18h às 23h. Delivery até 22h30!');
    } else if (messageBody.includes('entrega') || messageBody.includes('delivery')) {
      msg.reply('🛵 Fazemos entrega em toda a cidade! Taxa de entrega: R$ 5,00. Tempo estimado: 30-45 minutos.');
    } else if (messageBody.includes('preço') || messageBody.includes('preco')) {
      msg.reply('💰 Consulte nossos preços no cardápio! Digite "cardápio" para ver todas as opções.');
    } else {
      // Resposta padrão para mensagens não reconhecidas
      console.log(`🍕 Delivery Pizzaria - Mensagem não reconhecida: ${msg.body}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no handleDeliveryPizzariaMessage:', error.message);
  }
}

