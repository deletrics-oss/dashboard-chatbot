// server/fightarcade.js

const attachLogic = (client, io, clientSession, addEntry) => {
  const LINKS = {
    MERCADO_LIVRE: "https://www.mercadolivre.com.br/perfil/FIGHTARCADE",
    SHOPEE: "https://acesse.one/fliperamasnashopee",
    SITE_MDF: "https://www.fightarcade.com.br/mdf/",
    SITE_METAL: "https://www.fightarcade.com.br/metal/",
    CATALOGO_ESTAMPAS: "https://acesse.one/fightarcadeestampa",
    GRUPO_WHATSAPP: "https://chat.whatsapp.com/EqOUWXbKhHB6FrFdfogjRC",
    VENDAS_DIRETAS_WHATSAPP: "https://wa.me/5511984343166",
    TUTORIAL_BOTOES: "https://sl1nk.com/alterarbotoesdentrodojogo",
    MANUAL_USO: "https://l1nq.com/manualfightarcade",
    TUTORIAL_JOGOS: "https://sl1nk.com/adicionarouremoverjogos",
    TUTORIAL_CONTROLES_NOVOS: "https://sl1nk.com/configurarcontrolesnovos",
    TUTORIAL_RECUPERAR_SISTEMA: "https://sl1nk.com/recuperarosistema"
  };

  const sendMessage = async (user, text) => {
    await client.sendMessage(user, text);
    addEntry("message", {
      from: "Bot",
      to: user.replace("@c.us", ""),
      body: text,
      type: "bot",
    });
  };

  async function sendMainMenu(user, intro = "") {
    const mainMenuText = `${intro}O que gostaria de fazer agora?\n\n*1️⃣ - Ver modelos e preços*\n*2️⃣ - Ver opções de estampas*\n*3️⃣ - Suporte Técnico*\n*4️⃣ - Finalizar compra*\n*5️⃣ - Falar com um atendente*`;
    await sendMessage(user, mainMenuText);
    clientSession.sessions.userStates[user] =
      clientSession.sessions.userStates[user] || {};
    clientSession.sessions.userStates[user].stage =
      "aguardando_menu_principal";
  }

  client.on("message", async (msg) => {
    if (!msg.from.endsWith("@c.us")) return;

    const contact = await msg.getContact();
    const contactName = contact.pushname || msg.from.replace("@c.us", "");

    addEntry("message", {
      from: contactName,
      body: msg.body,
      type: "user",
    });

    const userStates = clientSession.sessions.userStates;
    const chat = await msg.getChat();
    const user = msg.from;
    const messageBody = msg.body.trim();

    if (!userStates[user]) {
      userStates[user] = { stage: "inicio" };
    }

    if (messageBody.match(/^(oi|olá|ola|menu|começar)/i)) {
      userStates[user] = { stage: "inicio" };
      await chat.sendStateTyping();
      await sendMessage(
        user,
        `Olá, ${contactName.split(" ")[0]}! 👋 Sou o assistente virtual da Fight Arcade.`
      );
      await sendMainMenu(user);
      return;
    }

    switch (userStates[user]?.stage) {
      case "aguardando_menu_principal":
        switch (messageBody) {
          case "1":
            await sendMessage(
              user,
              "Legal! Para começar, diga o que procura:\n\n*1️⃣ - Fliperama Completo*\n*2️⃣ - Apenas Controle USB*\n\n*0️⃣ - Voltar ao menu principal*"
            );
            userStates[user].stage = "aguardando_tipo_produto";
            break;
          default:
            await sendMessage(
              user,
              "Opção inválida. Por favor, digite um número de 1 a 5."
            );
            break;
        }
        break;

      case "aguardando_tipo_produto":
        if (messageBody === "0") {
          await sendMainMenu(user);
          break;
        }
        userStates[user].tipo_produto = messageBody.charAt(0);
        await sendMessage(
          user,
          `Entendido! E precisa para quantos jogadores?\n\n*1️⃣ - 1 Jogador*\n*2️⃣ - 2 Jogadores*\n\n*0️⃣ - Voltar*`
        );
        userStates[user].stage = "aguardando_jogadores";
        break;

      case "aguardando_jogadores":
        if (messageBody === "0") {
          await sendMessage(
            user,
            "Ok, a voltar. O que procura?\n\n*1️⃣ - Fliperama Completo*\n*2️⃣ - Apenas Controle USB*\n\n*0️⃣ - Voltar ao menu principal*"
          );
          userStates[user].stage = "aguardando_tipo_produto";
          break;
        }
        userStates[user].jogadores = messageBody.charAt(0);
        await sendMessage(
          user,
          `Ótimo! E qual material prefere?\n\n*1️⃣ - MDF*\n*2️⃣ - Metal*\n\n*0️⃣ - Voltar*`
        );
        userStates[user].stage = "aguardando_material";
        break;

      case "aguardando_material":
        if (messageBody === "0") {
          await sendMessage(
            user,
            `Ok, a voltar. Para quantos jogadores?\n\n*1️⃣ - 1 Jogador*\n*2️⃣ - 2 Jogadores*\n\n*0️⃣ - Voltar*`
          );
          userStates[user].stage = "aguardando_jogadores";
          break;
        }
        userStates[user].material = messageBody.charAt(0);
        await handleModelResponse(user, userStates[user]);
        userStates[user].stage = "inicio";
        break;
    }
  });

  async function handleModelResponse(user, state) {
    const { tipo_produto, jogadores, material } = state;
    let response =
      "Desculpe, não encontrei uma combinação para essa escolha. Por favor, digite *menu* para tentar novamente.";

    if (tipo_produto === "1") {
      if (jogadores === "1" && material === "1")
        response = `*Fliperama 1 Jogador em MDF:*\n🕹️ Comando Mecânico: R$ 499\n✨ Comando Óptico: R$ 550\nVeja mais em: ${LINKS.SITE_MDF}`;
      else if (jogadores === "1" && material === "2")
        response = `*Fliperama 1 Jogador em Metal:*\n🕹️ Comando Mecânico: R$ 599\n✨ Comando Óptico: R$ 650\nVeja mais em: ${LINKS.SITE_METAL}`;
      else if (jogadores === "2" && material === "1")
        response = `*Fliperama 2 Jogadores em MDF:*\n🕹️ Comandos Mecânicos: R$ 599\n✨ Comandos Ópticos: R$ 699\nVeja mais em: ${LINKS.SITE_MDF}`;
      else if (jogadores === "2" && material === "2")
        response = `*Fliperama 2 Jogadores em Metal:*\n🕹️ Comandos Mecânicos: R$ 699\n✨ Comandos Ópticos: R$ 799\nVeja mais em: ${LINKS.SITE_METAL}`;
    } else if (tipo_produto === "2") {
      if (jogadores === "1")
        response =
          "*Controle USB 1 Jogador:*\n\n*Em MDF:*\n🕹️ Mecânico: R$ 299\n✨ Óptico: R$ 350\n\n*Em Metal:*\n🕹️ Mecânico: R$ 399\n✨ Óptico: R$ 450";
      else if (jogadores === "2")
        response =
          "*Controle USB 2 Jogadores:*\n\n*Em MDF:*\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 599\n\n*Em Metal:*\n🕹️ Mecânico: R$ 650\n✨ Óptico: R$ 750";
    }

    await sendMessage(user, response);

    if (!response.startsWith("Desculpe")) {
      await sendMessage(
        user,
        `*Gostou? Peça o seu agora com Vantagens Exclusivas!* 🔥\n\n✅ *ENTREGA NO MESMO DIA*\nReceba hoje mesmo por motoboy (Uber Moto ou Lalamove).\n\n✅ *PAGUE AO RECEBER*\nVocê paga diretamente para o entregador quando o produto chegar.\n\n🎨 *PERSONALIZE A SUA ESTAMPA*\nEscolha a sua arte preferida no nosso catálogo:\n${LINKS.CATALOGO_ESTAMPAS}\n\n*Clique no link abaixo para falar com Vendas Diretas e fechar o seu pedido agora:*\n👉 ${LINKS.VENDAS_DIRETAS_WHATSAPP}`
      );
    }
    await sendMainMenu(user, "Posso ajudar com mais alguma coisa? ");
  }
};

export default attachLogic;
