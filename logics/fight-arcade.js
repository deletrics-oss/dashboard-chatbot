// logics/fight-arcade.js
module.exports = function handleFightArcadeMessage(msg, client) {
  const text = msg.body.trim().toLowerCase();

  if (text.includes('oi') || text.includes('olá')) {
    return client.sendMessage(msg.from, 'Olá! Bem-vindo ao suporte da FightArcade 👊');
  }

  if (text.includes('ajuda')) {
    return client.sendMessage(msg.from, 'Claro! Digite "menu" para ver as opções.');
  }

  if (text.includes('menu')) {
    return client.sendMessage(msg.from, 'Menu FightArcade:\n1️⃣ Suporte técnico\n2️⃣ Produtos\n3️⃣ Falar com atendente');
  }
};
