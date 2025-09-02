/**
 * fight-arcade.js
 * Bot de atendimento FightArcade no WhatsApp
 */

const userStates = {}; // memória simples para estados

/**
 * MENU PRINCIPAL
 */
function handleFightArcadeMessage(message, client) {
  const user = message.from;
  const text = message.body.trim().toLowerCase();

  // Se for a primeira vez ou usuário digitou "menu"
  if (!userStates[user] || text === "menu") {
    userStates[user] = { stage: "aguardando_menu_principal" };

    const menu =
      "👋 Olá, bem-vindo ao *FightArcade*!\n\n" +
      "Escolha uma opção:\n\n" +
      "1️⃣ Suporte Técnico\n" +
      "2️⃣ Finalizar Compra\n" +
      "3️⃣ Falar com Atendente\n\n" +
      "👉 Digite o número da opção desejada.";
    client.sendMessage(user, menu);
    return;
  }

  // Roteamento baseado no estágio
  switch (userStates[user].stage) {
    case "aguardando_menu_principal":
      if (text === "1") {
        userStates[user] = { stage: "aguardando_suporte" };
        showSupportMenu(user, client);
      } else if (text === "2") {
        userStates[user] = { stage: "aguardando_compra" };
        showPurchaseMenu(user, client);
      } else if (text === "3") {
        userStates[user] = { stage: "atendente" };
        client.sendMessage(
          user,
          "📞 Um atendente humano falará com você em instantes..."
        );
      } else {
        client.sendMessage(
          user,
          "❌ Opção inválida. Digite *menu* para ver as opções novamente."
        );
      }
      break;

    case "aguardando_suporte":
      handleSupportResponse(user, text, client);
      break;

    case "aguardando_compra":
      handlePurchaseResponse(user, text, client);
      break;

    case "atendente":
      client.sendMessage(
        user,
        "📞 Aguarde, já estamos te conectando com um atendente."
      );
      break;

    default:
      client.sendMessage(user, "❌ Algo deu errado. Digite *menu* para voltar.");
      userStates[user] = { stage: "aguardando_menu_principal" };
      break;
  }
}

/**
 * MENU DE SUPORTE TÉCNICO
 */
function showSupportMenu(user, client) {
  const supportMenu =
    "🛠️ *Suporte Técnico - Opções:*\n\n" +
    "1️⃣ Comando não funciona\n" +
    "2️⃣ Comando andando sozinho\n" +
    "3️⃣ Botões não funcionam\n" +
    "4️⃣ Fliperama não liga\n" +
    "5️⃣ HDMI não funciona\n" +
    "6️⃣ Fonte não funciona\n" +
    "7️⃣ Alterar controles\n" +
    "8️⃣ Manual do usuário\n" +
    "9️⃣ Adicionar/remover jogos\n" +
    "10️⃣ Instalar controle adicional\n" +
    "11️⃣ Regravar sistema\n\n" +
    "0️⃣ Voltar ao menu principal\n\n" +
    "👉 Digite o número da opção desejada.";
  client.sendMessage(user, supportMenu);
}

/**
 * RESPOSTAS DO SUPORTE
 */
function handleSupportResponse(user, text, client) {
  let response = "";

  switch (text) {
    case "1":
      response =
        "🔧 *Comando não funciona*\n\n" +
        "1️⃣ Verifique os fios da placa (LED deve estar aceso).\n" +
        "2️⃣ Se for 2 jogadores, teste o hub USB.\n" +
        "3️⃣ Se não resolver, pode ser necessário trocar a placa.\n\n" +
        "👉 Digite *menu* para voltar ou *5* no menu principal para falar com atendente.";
      break;

    case "2":
      response =
        "🕹️ *Comando andando sozinho*\n\n" +
        "➡️ *Mecânico:* ajuste a micro-switch, entortando levemente a haste.\n" +
        "➡️ *Óptico:* verifique luz ambiente e ajuste o trimpot azul.\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "3":
      response =
        "🔴 *Botões não funcionam*\n\n" +
        "1️⃣ Abra a tampa traseira.\n" +
        "2️⃣ Verifique fios soltos do botão ou da placa.\n" +
        "3️⃣ Reencaixe firmemente.\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "4":
      response =
        "⚡ *Fliperama não liga*\n\n" +
        "1️⃣ Verifique tomada, cabo e botão de ligar.\n" +
        "2️⃣ Teste com fonte de roteador (12V / 1-3A).\n" +
        "3️⃣ Pode até usar 5V 2A para teste rápido.\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "5":
      response =
        "📺 *HDMI não funciona*\n\n" +
        "1️⃣ Troque o cabo HDMI.\n" +
        "2️⃣ Tente outra porta da TV.\n" +
        "3️⃣ Teste em outra TV.\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "6":
      response =
        "🔌 *Fonte não funciona*\n\n" +
        "1️⃣ Teste com outra fonte 12V.\n" +
        "2️⃣ Se funcionar, peça reposição.\n" +
        "3️⃣ Se não, pode ser a placa.\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "7":
      response =
        "⚙️ *Alterar controles*\n\n" +
        "Isso só pode ser feito dentro dos jogos.\n" +
        "📖 Guia: 👉 https://sl1nk.com/alterarbotoesdentrodojogo\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "8":
      response =
        "📘 *Manual do usuário*\n\n" +
        "👉 https://l1nq.com/manualfightarcade\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "9":
      response =
        "🎮 *Adicionar/remover jogos*\n\n" +
        "👉 https://sl1nk.com/adicionarouremoverjogos\n\n" +
        "⚠️ Se feito errado, pode danificar o sistema!\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "10":
      response =
        "➕ *Instalar controle adicional*\n\n" +
        "👉 https://sl1nk.com/configurarcontrolesnovos\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "11":
      response =
        "💾 *Regravar o sistema*\n\n" +
        "👉 https://sl1nk.com/recuperarosistema\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "0":
      userStates[user] = { stage: "aguardando_menu_principal" };
      handleFightArcadeMessage({ from: user, body: "menu" }, client);
      return;

    default:
      response = "❌ Opção inválida. Digite um número válido ou *menu* para voltar.";
      break;
  }

  client.sendMessage(user, response);
  userStates[user] = { stage: "aguardando_suporte" };
}

/**
 * MENU DE COMPRA
 */
function showPurchaseMenu(user, client) {
  const purchaseMenu =
    "🛒 *Finalizar Compra*\n\n" +
    "1️⃣ Ver catálogo\n" +
    "2️⃣ Solicitar orçamento\n" +
    "3️⃣ Falar com atendente\n\n" +
    "0️⃣ Voltar ao menu principal\n\n" +
    "👉 Digite o número da opção desejada.";
  client.sendMessage(user, purchaseMenu);
}

/**
 * RESPOSTAS DA COMPRA
 */
function handlePurchaseResponse(user, text, client) {
  let response = "";

  switch (text) {
    case "1":
      response =
        "📦 *Catálogo FightArcade*\n\n" +
        "👉 Acesse: https://l1nq.com/catalogofightarcade\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "2":
      response =
        "💰 *Solicitar Orçamento*\n\n" +
        "Por favor, envie o produto desejado + CEP para cálculo do frete.\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "3":
      response = "📞 Um atendente humano falará com você em instantes...";
      userStates[user] = { stage: "atendente" };
      break;

    case "0":
      userStates[user] = { stage: "aguardando_menu_principal" };
      handleFightArcadeMessage({ from: user, body: "menu" }, client);
      return;

    default:
      response = "❌ Opção inválida. Digite um número válido ou *menu* para voltar.";
      break;
  }

  client.sendMessage(user, response);
  if (userStates[user].stage !== "atendente") {
    userStates[user] = { stage: "aguardando_compra" };
  }
}

// Exporta funções
module.exports = {
  handleFightArcadeMessage,
};
