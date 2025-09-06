// fight-arcade.js
// Chatbot FightArcade - Suporte e Atendimento via WhatsApp

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

// =========================
// CONFIGURAÇÃO DO CLIENTE
// =========================
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true },
});

// Estado dos usuários
let userStates = {};

// =========================
// INICIALIZAÇÃO
// =========================
client.on("qr", (qr) => {
  console.log("Escaneie este QR Code para conectar:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Chatbot FightArcade conectado e pronto!");
});

// =========================
// RECEBIMENTO DE MENSAGENS
// =========================
client.on("message", async (message) => {
  const user = message.from;
  const text = message.body.trim().toLowerCase();

  // Se for o primeiro contato → inicia no menu principal
  if (!userStates[user]) {
    userStates[user] = { stage: "aguardando_menu_principal" };
    await handleFightArcadeMessage(message, client);
    return;
  }

  const stage = userStates[user].stage;

  if (stage === "aguardando_menu_principal") {
    await handleFightArcadeMessage(message, client);
  } else if (stage === "aguardando_suporte") {
    handleSupportResponse(user, text, client);
  }
});

// =========================
// MENU PRINCIPAL
// =========================
async function handleFightArcadeMessage(message, client) {
  const user = message.from;
  const text = message.body.trim().toLowerCase();

  if (text === "menu" || text === "início" || text === "start") {
    const menu =
      "🎮 *Bem-vindo ao Suporte FightArcade!*\n\n" +
      "Escolha uma opção:\n\n" +
      "1️⃣ Finalizar compra\n" +
      "2️⃣ Suporte técnico\n" +
      "3️⃣ Falar com atendente\n\n" +
      "👉 Digite o número da opção desejada.";

    userStates[user] = { stage: "aguardando_menu_principal" };
    await client.sendMessage(user, menu);
    return;
  }

  switch (text) {
    case "1":
      await client.sendMessage(
        user,
        "🛒 *Finalizar compra*\n\n" +
          "Acesse nosso catálogo e finalize sua compra clicando aqui:\n" +
          "👉 https://l1nq.com/fightarcade\n\n" +
          "Digite *menu* para voltar."
      );
      break;

    case "2":
      await showSupportMenu(user, client);
      break;

    case "3":
      await client.sendMessage(
        user,
        "📞 *Atendente humano*\n\n" +
          "Nosso time de atendimento falará com você em instantes.\n\n" +
          "👉 Digite *menu* para voltar."
      );
      break;

    default:
      await client.sendMessage(
        user,
        "❌ Opção inválida.\n\nDigite *menu* para voltar ao menu principal."
      );
      break;
  }
}

// =========================
// MENU DE SUPORTE
// =========================
async function showSupportMenu(user, client) {
  const supportMenu =
    "🛠️ *Suporte Técnico FightArcade*\n\n" +
    "Escolha um problema:\n\n" +
    "1️⃣ Comando não funciona\n" +
    "2️⃣ Comando andando sozinho\n" +
    "3️⃣ Botões não funcionam\n" +
    "4️⃣ Fliperama não liga\n" +
    "5️⃣ HDMI não funciona\n" +
    "6️⃣ Fonte não funciona\n" +
    "7️⃣ Alterar configuração dos controles\n" +
    "8️⃣ Manual de utilização\n" +
    "9️⃣ Adicionar/remover jogos\n" +
    "🔟 Instalar controle adicional\n" +
    "1️⃣1️⃣ Regravar sistema\n\n" +
    "0️⃣ Voltar ao menu principal";

  userStates[user] = { stage: "aguardando_suporte" };
  await client.sendMessage(user, supportMenu);
}

// =========================
// RESPOSTAS DE SUPORTE
// =========================
function handleSupportResponse(user, text, client) {
  let response = "";

  switch (text) {
    case "1":
      response =
        "🔧 *Comando não funciona*\n\n" +
        "1️⃣ Verifique os fios da placa (LED deve estar aceso).\n" +
        "2️⃣ Se for de 2 jogadores, teste o hub USB.\n" +
        "3️⃣ Se não resolver, pode ser necessário trocar a placa.\n\n" +
        "👉 Digite *menu* para voltar ou *3* no menu principal para falar com atendente.";
      break;

    case "2":
      response =
        "🕹️ *Comando andando sozinho*\n\n" +
        "➡️ *Mecânico:* ajuste a micro-switch, entortando levemente a haste.\n" +
        "➡️ *Óptico:* verifique se há luz ambiente interferindo e ajuste o trimpot azul.\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "3":
      response =
        "🔴 *Botões não funcionam*\n\n" +
        "1️⃣ Abra a tampa traseira.\n" +
        "2️⃣ Verifique se os fios estão soltos do botão ou da placa zero-delay.\n" +
        "3️⃣ Reencaixe firmemente.\n\n" +
        "👉 Se continuar, digite *menu* e escolha falar com atendente.";
      break;

    case "4":
      response =
        "⚡ *Fliperama não liga*\n\n" +
        "1️⃣ Verifique tomada, cabo e botão de ligar.\n" +
        "2️⃣ Teste com fonte de roteador (12V / 1-3A).\n" +
        "3️⃣ Pode até usar 5V 2A para teste rápido.\n\n" +
        "👉 Se confirmar que a fonte não funciona, peça reposição digitando *menu*.";
      break;

    case "5":
      response =
        "📺 *HDMI não funciona*\n\n" +
        "1️⃣ Troque o cabo HDMI.\n" +
        "2️⃣ Tente outra porta da TV.\n" +
        "3️⃣ Teste em outra TV.\n\n" +
        "👉 Se não funcionar, pode ser saída de vídeo. Digite *menu* para falar com atendente.";
      break;

    case "6":
      response =
        "🔌 *Fonte não funciona*\n\n" +
        "1️⃣ Teste com outra fonte 12V.\n" +
        "2️⃣ Se funcionar, peça reposição.\n" +
        "3️⃣ Se não, pode ser a placa → fale com atendente.\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "7":
      response =
        "⚙️ *Alterar configurações dos controles*\n\n" +
        "Isso só pode ser feito dentro dos jogos.\n" +
        "📖 Guia completo: 👉 https://sl1nk.com/alterarbotoesdentrodojogo\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "8":
      response =
        "📘 *Como utilizar o fliperama*\n\n" +
        "Manual completo do usuário: 👉 https://l1nq.com/manualfightarcade\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "9":
      response =
        "🎮 *Como adicionar/remover jogos*\n\n" +
        "Tutorial: 👉 https://sl1nk.com/adicionarouremoverjogos\n\n" +
        "⚠️ Se feito errado, pode danificar o sistema!\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "10":
      response =
        "➕ *Como instalar um controle adicional*\n\n" +
        "Guia completo: 👉 https://sl1nk.com/configurarcontrolesnovos\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "11":
      response =
        "💾 *Como regravar o sistema*\n\n" +
        "Tutorial completo: 👉 https://sl1nk.com/recuperarosistema\n\n" +
        "👉 Digite *menu* para voltar.";
      break;

    case "0":
      userStates[user] = { stage: "aguardando_menu_principal" };
      handleFightArcadeMessage({ from: user, body: "menu" }, client);
      return;

    default:
      response =
        "❌ Opção inválida.\n\nDigite um número válido ou *menu* para voltar ao início.";
      break;
  }

  client.sendMessage(user, response);
  userStates[user] = { stage: "aguardando_suporte" };
}

// =========================
// INICIAR CLIENTE
// =========================
client.initialize();
