// logics/fight-arcade.js
// Fluxo completo para clientes do Facebook interessados nos Fliperamas Fight Arcade
// VERSÃO CORRIGIDA E OTIMIZADA

export function handleFightArcadeMessage(msg, client) {
  const text = msg.body.trim().toLowerCase();

  // === INÍCIO: Saudação (Esta parte já estava correta) ===
  if (text.match(/^(oi|olá|ola|bom dia|boa tarde|boa noite|menu|início|start|0)/i)) {
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
    return; // Encerra a execução aqui para não cair nas outras lógicas
  }

  // === ESTRUTURA LÓGICA CORRIGIDA COM IF...ELSE IF... ===

  // --- MENU PRINCIPAL ---
  else if (text === "1") {
    client.sendMessage(
      msg.from,
      "Legal! Para começar, me diga o que você procura:\n\n" +
        "1.1️⃣ - Fliperama Completo (com jogos)\n" +
        "1.2️⃣ - Apenas Controle USB (para PC/Fightcade, sem jogos)"
    );
  } else if (text === "2") {
    client.sendMessage(
      msg.from,
      "A personalização é a parte mais divertida! Você pode escolher entre dezenas de estampas para deixar o fliperama com a sua cara.\n\n" +
        "🎥 Veja o vídeo com algumas estampas incríveis!\n" +
        "👉 https://acesse.one/fightarcadeestampa\n\n" +
        "Depois de ver as estampas, você pode:\n" +
        "4️⃣ - Finalizar compra\n" +
        "1️⃣ - Ver modelos de novo\n" +
        "5️⃣ - Falar com atendente"
    );
  } else if (text === "3") {
    client.sendMessage(
      msg.from,
      "Entendo que precisa de ajuda com seu fliperama. Selecione o problema que você está enfrentando:\n\n" +
        "3.1 - Comando não funciona\n" +
        "3.2 - Comando andando sozinho\n" +
        "3.3 - Botões não funcionam\n" +
        "3.4 - Fliperama não liga / inicializa\n" +
        "3.5 - HDMI não funciona\n" +
        "3.6 - Fonte não funciona\n" +
        "3.7 - Alterar configurações dos controles\n" +
        "3.8 - Como utilizar o fliperama\n" +
        "3.9 - Como adicionar mais jogos\n" +
        "3.10 - Como instalar um controle adicional\n" +
        "3.11 - Como regravar o sistema\n\n" +
        "Digite 0 para Voltar ao menu principal"
    );
  } else if (text === "4") {
    client.sendMessage(
      msg.from,
      "Que ótimo! Para finalizar sua compra, você tem duas opções:\n\n" +
        "4.1️⃣ - Comprar Online (Mercado Livre / Shopee)\n" +
        "4.2️⃣ - Finalizar com Atendente (Entrega Expressa)"
    );
  } else if (text === "5") {
    client.sendMessage(
      msg.from,
      "Tudo bem! Já estou transferindo sua conversa para um de nossos especialistas. Por favor, aguarde um momento. 🙂"
    );
  }

  // --- SUBMENUS MODELOS E PREÇOS (Opção 1) ---
  else if (text === "1.1" || text.includes("fliperama completo")) {
    client.sendMessage(
      msg.from,
      "Certo, vamos ver os Fliperamas Completos! Você prefere para quantos jogadores?\n\n" +
        "1️⃣ - 1 Jogador\n" +
        "2️⃣ - 2 Jogadores"
    );
  } else if (text === "1.2" || text.includes("controle usb")) {
    client.sendMessage(
      msg.from,
      "Entendido, vamos ver os Controles USB! Você precisa para quantos jogadores?\n\n" +
        "1️⃣ - 1 Jogador\n" +
        "2️⃣ - 2 Jogadores"
    );
  }

  // --- SUB-SUBMENUS (Exemplos de produtos) ---
  // A lógica aqui depende da conversa anterior, usar "includes" é uma boa forma de capturar a intenção
  else if (text.includes("fliperama 1 mdf")) {
    client.sendMessage(
      msg.from,
      "Perfeito! Para o Fliperama de 1 Jogador em MDF:\n" +
        "🕹️ Mecânico: R$ 499\n" +
        "✨ Óptico: R$ 550\n" +
        "🔗 www.fightarcade.com.br/mdf"
    );
  } else if (text.includes("fliperama 1 metal")) {
    client.sendMessage(
      msg.from,
      "Excelente! Para o Fliperama de 1 Jogador em Metal:\n" +
        "🕹️ Mecânico: R$ 599\n" +
        "✨ Óptico: R$ 650\n" +
        "🔗 www.fightarcade.com.br/metal"
    );
  } else if (text.includes("fliperama 2 mdf")) {
    client.sendMessage(
      msg.from,
      "Show! Para o Fliperama de 2 Jogadores em MDF:\n" +
        "🕹️ Mecânico: R$ 599\n" +
        "✨ Óptico: R$ 699\n" +
        "🔗 www.fightarcade.com.br/mdf"
    );
  } else if (text.includes("fliperama 2 metal")) {
    client.sendMessage(
      msg.from,
      "Ótima pedida! Para o Fliperama de 2 Jogadores em Metal:\n" +
        "🕹️ Mecânico: R$ 699\n" +
        "✨ Óptico: R$ 799\n" +
        "🔗 www.fightarcade.com.br/metal"
    );
  } else if (text.includes("usb 1")) {
    client.sendMessage(
      msg.from,
      "Controle USB 1 Jogador:\n\n" +
        "MDF:\n🕹️ Mecânico: R$ 299\n✨ Óptico: R$ 350\n🚀 Óptico Pico: R$ 450\n\n" +
        "Metal:\n🕹️ Mecânico: R$ 399\n✨ Óptico: R$ 450"
    );
  } else if (text.includes("usb 2")) {
    client.sendMessage(
      msg.from,
      "Controle USB 2 Jogadores:\n\n" +
        "MDF:\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 599\n\n" +
        "Metal:\n🕹️ Mecânico: R$ 650\n✨ Óptico: R$ 750"
    );
  }

  // --- SUBMENUS SUPORTE TÉCNICO (Opção 3) ---
  // Usei números como "3.1", "3.2" para evitar conflito com as opções de outros menus
  else if (text === "3.1" || text.includes("comando não funciona")) {
    client.sendMessage(
      msg.from,
      "Ok, vamos resolver isso! Verifique os fios e a placa (LED aceso). Se não resolver, teste o hub USB (se for 2 players). Se nada funcionar, digite 5 para falar com um atendente."
    );
  } else if (text === "3.2" || text.includes("comando andando sozinho")) {
    client.sendMessage(
      msg.from,
      "Se for MECÂNICO: ajuste a micro-switch (entorte levemente a haste).\nSe for ÓPTICO: verifique a luz ambiente e ajuste o trimpot azul da placa do sensor."
    );
  } else if (text === "3.3" || text.includes("botões não funcionam")) {
    client.sendMessage(
      msg.from,
      "Abra a tampa traseira, verifique se há fios soltos do botão ou da placa zero-delay. Reencaixe firmemente. Se não resolver, digite 5 para falar com um atendente."
    );
  } else if (text === "3.4" || text.includes("não liga")) {
    client.sendMessage(
      msg.from,
      "Verifique a tomada, o cabo e o botão de ligar. Teste com uma fonte de roteador (12V). Pode usar 12V 1-3A ou até 5V 2A para um teste rápido. Se confirmar que a fonte está com problema, peça uma nova com um atendente (digite 5)."
    );
  } else if (text === "3.5" || text.includes("hdmi")) {
    client.sendMessage(
      msg.from,
      "Troque o cabo HDMI, tente outra porta na TV e, se possível, teste em outra TV. Se nada funcionar, pode ser a saída de vídeo do aparelho. Digite 5 para falar com um atendente."
    );
  } else if (text === "3.6" || text.includes("fonte")) {
    client.sendMessage(
      msg.from,
      "Teste com outra fonte compatível (12V). Se funcionar, peça uma reposição conosco. Se não, o problema pode ser na placa principal. Fale com um atendente digitando 5."
    );
  } else if (text === "3.7" || text.includes("configurações dos controles")) {
    client.sendMessage(
      msg.from,
      "As configurações dos botões só podem ser alteradas dentro de cada jogo. Temos um guia completo aqui: 👉 https://sl1nk.com/alterarbotoesdentrodojogo"
    );
  } else if (text === "3.8" || text.includes("como utilizar")) {
    client.sendMessage(
      msg.from,
      "Você pode acessar o manual completo do usuário neste link: 👉 https://l1nq.com/manualfightarcade"
    );
  } else if (text === "3.9" || text.includes("adicionar jogos")) {
    client.sendMessage(
      msg.from,
      "Preparamos um tutorial detalhado para adicionar ou remover jogos: 👉 https://sl1nk.com/adicionarouremoverjogos"
    );
  } else if (text === "3.10" || text.includes("controle adicional")) {
    client.sendMessage(
      msg.from,
      "Siga nosso guia para configurar um novo controle: 👉 https://sl1nk.com/configurarcontrolesnovos"
    );
  } else if (text === "3.11" || text.includes("regravar sistema")) {
    client.sendMessage(
      msg.from,
      "Se precisar reinstalar o sistema do zero, siga nosso tutorial completo de recuperação: 👉 https://sl1nk.com/recuperarosistema"
    );
  }
  // Se nenhuma das opções acima for correspondida, você pode adicionar uma mensagem padrão ou não fazer nada.
  // Ex: else { client.sendMessage(msg.from, "Opção inválida. Digite 'menu' para ver as opções novamente."); }
}
