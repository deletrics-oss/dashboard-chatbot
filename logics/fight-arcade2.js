// logics/fight-arcade.js
// Fluxo completo para clientes do Facebook interessados nos Fliperamas Fight Arcade

export function handleFightArcadeMessage(msg, client) {
  const text = msg.body.trim().toLowerCase();

  // === INÍCIO: Saudação ===
  if (text.match(/^(oi|olá|ola|bom dia|boa tarde|boa noite|menu|início|start)/i)) {
    client.sendMessage(
      msg.from,
      "Olá! 👋 Vi que você veio do Facebook e tem interesse em nossos fliperamas. Que legal! Sou seu assistente virtual e vou te ajudar a encontrar tudo o que precisa.\n\n" +
        "Para começarmos, me diga o que você gostaria de fazer:\n\n" +
        "1️⃣ - Ver modelos e preços\n" +
        "2️⃣ - Ver opções de estampas\n" +
        "3️⃣ - Suporte Técnico\n" +
        "4️⃣ - Finalizar compra\n" +
        "5️⃣ - Falar com um atendente"
    );
    return;
  }

  // === MENU PRINCIPAL ===
  switch (text) {
    case "1":
      client.sendMessage(
        msg.from,
        "Legal! Para começar, me diga o que você procura:\n\n" +
          "1️⃣ - Fliperama Completo (com jogos)\n" +
          "2️⃣ - Apenas Controle USB (para PC/Fightcade, sem jogos)"
      );
      break;

    case "2":
      client.sendMessage(
        msg.from,
        "A personalização é a parte mais divertida! Você pode escolher entre dezenas de estampas para deixar o fliperama com a sua cara.\n\n" +
          "🎥 Veja o vídeo com algumas estampas incríveis!\n" +
          "👉 https://acesse.one/fightarcadeestampa\n\n" +
          "Depois de ver as estampas, você pode:\n" +
          "1️⃣ - Finalizar compra\n" +
          "2️⃣ - Ver modelos de novo\n" +
          "3️⃣ - Falar com atendente"
      );
      break;

    case "3":
      client.sendMessage(
        msg.from,
        "Entendo que precisa de ajuda com seu fliperama. Selecione o problema que você está enfrentando:\n\n" +
          "1 - Comando não funciona\n" +
          "2 - Comando andando sozinho\n" +
          "3 - Botões não funcionam\n" +
          "4 - Fliperama não liga / inicializa\n" +
          "5 - HDMI não funciona\n" +
          "6 - Fonte não funciona\n" +
          "7 - Alterar configurações dos controles\n" +
          "8 - Como utilizar o fliperama\n" +
          "9 - Como adicionar mais jogos\n" +
          "10 - Como instalar um controle adicional\n" +
          "11 - Como regravar o sistema\n" +
          "0 - Voltar ao menu principal"
      );
      break;

    case "4":
      client.sendMessage(
        msg.from,
        "Que ótimo! Para finalizar sua compra, você tem duas opções:\n\n" +
          "1️⃣ - Comprar Online (Mercado Livre / Shopee)\n" +
          "2️⃣ - Finalizar com Atendente (Entrega Expressa)"
      );
      break;

    case "5":
      client.sendMessage(
        msg.from,
        "Tudo bem! Já estou transferindo sua conversa para um de nossos especialistas. Por favor, aguarde um momento. 🙂"
      );
      break;
  }

  // === SUBMENUS MODELOS E PREÇOS ===
  if (text === "1.1" || text.includes("fliperama completo")) {
    client.sendMessage(
      msg.from,
      "Certo, vamos ver os Fliperamas Completos! Você prefere para quantos jogadores?\n\n" +
        "1️⃣ - 1 Jogador\n" +
        "2️⃣ - 2 Jogadores"
    );
  }
  if (text === "1.2" || text.includes("controle usb")) {
    client.sendMessage(
      msg.from,
      "Entendido, vamos ver os Controles USB! Você precisa para quantos jogadores?\n\n" +
        "1️⃣ - 1 Jogador\n" +
        "2️⃣ - 2 Jogadores"
    );
  }

  // Exemplos de fliperama
  if (text.includes("fliperama 1 mdf")) {
    client.sendMessage(
      msg.from,
      "Perfeito! Para o Fliperama de 1 Jogador em MDF:\n" +
        "🕹️ Mecânico: R$ 499\n" +
        "✨ Óptico: R$ 550\n" +
        "🔗 www.fightarcade.com.br/mdf"
    );
  }
  if (text.includes("fliperama 1 metal")) {
    client.sendMessage(
      msg.from,
      "Excelente! Para o Fliperama de 1 Jogador em Metal:\n" +
        "🕹️ Mecânico: R$ 599\n" +
        "✨ Óptico: R$ 650\n" +
        "🔗 www.fightarcade.com.br/metal"
    );
  }
  if (text.includes("fliperama 2 mdf")) {
    client.sendMessage(
      msg.from,
      "Show! Para o Fliperama de 2 Jogadores em MDF:\n" +
        "🕹️ Mecânico: R$ 599\n" +
        "✨ Óptico: R$ 699\n" +
        "🔗 www.fightarcade.com.br/mdf"
    );
  }
  if (text.includes("fliperama 2 metal")) {
    client.sendMessage(
      msg.from,
      "Ótima pedida! Para o Fliperama de 2 Jogadores em Metal:\n" +
        "🕹️ Mecânico: R$ 699\n" +
        "✨ Óptico: R$ 799\n" +
        "🔗 www.fightarcade.com.br/metal"
    );
  }

  // Exemplos de USB
  if (text.includes("usb 1")) {
    client.sendMessage(
      msg.from,
      "Controle USB 1 Jogador:\n\n" +
        "MDF:\n🕹️ Mecânico: R$ 299\n✨ Óptico: R$ 350\n🚀 Óptico Pico: R$ 450\n\n" +
        "Metal:\n🕹️ Mecânico: R$ 399\n✨ Óptico: R$ 450"
    );
  }
  if (text.includes("usb 2")) {
    client.sendMessage(
      msg.from,
      "Controle USB 2 Jogadores:\n\n" +
        "MDF:\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 599\n\n" +
        "Metal:\n🕹️ Mecânico: R$ 650\n✨ Óptico: R$ 750"
    );
  }

  // === SUPORTE TÉCNICO ===
  if (text === "3.1" || text.includes("comando não funciona")) {
    client.sendMessage(
      msg.from,
      "Ok, vamos resolver isso! Verifique fios e placa (LED aceso). Se não resolver, teste o hub USB (se 2 players). Se nada funcionar, digite 0 e fale com um atendente."
    );
  }
  if (text === "3.2" || text.includes("comando andando sozinho")) {
    client.sendMessage(
      msg.from,
      "Se for MECÂNICO: ajuste a micro-switch (entorte levemente a haste).\nSe for ÓPTICO: verifique luz ambiente e ajuste o trimpot azul da placa do sensor."
    );
  }
  if (text === "3.3" || text.includes("botões não funcionam")) {
    client.sendMessage(
      msg.from,
      "Abra a tampa traseira, verifique fios soltos do botão ou placa zero-delay. Reencaixe firmemente. Se não resolver, digite 0 para falar com atendente."
    );
  }
  if (text === "3.4" || text.includes("não liga")) {
    client.sendMessage(
      msg.from,
      "Verifique tomada, cabo, botão ligar. Teste fonte de roteador 12V. Pode usar 12V 1-3A ou até 5V 2A para teste rápido. Se confirmar fonte ruim, peça uma nova com atendente."
    );
  }
  if (text === "3.5" || text.includes("hdmi")) {
    client.sendMessage(
      msg.from,
      "Troque o cabo HDMI, tente outra porta da TV, teste em outra TV. Se não funcionar, pode ser saída de vídeo → digite 0 para falar com atendente."
    );
  }
  if (text === "3.6" || text.includes("fonte")) {
    client.sendMessage(
      msg.from,
      "Teste outra fonte (12V). Se funcionar, peça reposição conosco. Se não, pode ser placa → fale com atendente."
    );
  }
  if (text === "3.7" || text.includes("configurações dos controles")) {
    client.sendMessage(
      msg.from,
      "Configurações só podem ser alteradas dentro dos jogos. Guia completo: 👉 https://sl1nk.com/alterarbotoesdentrodojogo"
    );
  }
  if (text === "3.8" || text.includes("como utilizar")) {
    client.sendMessage(
      msg.from,
      "Manual completo do usuário: 👉 https://l1nq.com/manualfightarcade"
    );
  }
  if (text === "3.9" || text.includes("adicionar jogos")) {
    client.sendMessage(
      msg.from,
      "Tutorial para adicionar/remover jogos: 👉 https://sl1nk.com/adicionarouremoverjogos"
    );
  }
  if (text === "3.10" || text.includes("controle adicional")) {
    client.sendMessage(
      msg.from,
      "Guia para configurar novo controle: 👉 https://sl1nk.com/configurarcontrolesnovos"
    );
  }
  if (text === "3.11" || text.includes("regravar sistema")) {
    client.sendMessage(
      msg.from,
      "Tutorial completo para recuperar sistema: 👉 https://sl1nk.com/recuperarosistema"
    );
  }
}
