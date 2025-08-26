// logics/fight-arcade.js
export function handleFightArcadeMessage(msg, client) {
  const text = msg.body.toLowerCase();

  if (text.includes("oi") || text.includes("olá")) {
    client.sendMessage(msg.from, "👊 Bem-vindo ao *Fight Arcade*! Prepare-se para jogar.");
  } else if (text.includes("fichas")) {
    client.sendMessage(msg.from, "Cada ficha custa R$2,00. Quantas deseja comprar?");
  } else if (text.includes("horário")) {
    client.sendMessage(msg.from, "Abrimos todos os dias das 10h às 22h 🎮");
  } else {
    client.sendMessage(msg.from, "Não entendi 🤔. Digite *fichas* ou *horário*.");
  }
}
