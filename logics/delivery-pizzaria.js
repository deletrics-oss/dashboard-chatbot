// logics/delivery-pizzaria.js
export function handleDeliveryPizzariaMessage(msg, client) {
  const text = msg.body.toLowerCase();

  if (text.includes("menu") || text.includes("cardápio")) {
    client.sendMessage(msg.from, "🍕 Nosso cardápio:\n1️⃣ Margherita\n2️⃣ Calabresa\n3️⃣ Frango com Catupiry\nDigite o número para pedir!");
  } else if (text.includes("1")) {
    client.sendMessage(msg.from, "Você escolheu Margherita 🍅🧀. Confirma pedido?");
  } else if (text.includes("2")) {
    client.sendMessage(msg.from, "Você escolheu Calabresa 🌶️. Confirma pedido?");
  } else if (text.includes("3")) {
    client.sendMessage(msg.from, "Você escolheu Frango com Catupiry 🐔🧀. Confirma pedido?");
  } else if (text.includes("confirmo")) {
    client.sendMessage(msg.from, "✅ Pedido confirmado! Entrega em até 40 minutos.");
  } else {
    client.sendMessage(msg.from, "Digite *menu* para ver o cardápio.");
  }
}
