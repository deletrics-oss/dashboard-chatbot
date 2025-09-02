// logics/fight-arcade-stateful.js
// FLUXO COMPLETO E ROBUSTO COM MÁQUINA DE ESTADOS (COM MEMÓRIA)

// Em um ambiente de produção real, use um banco de dados (como Redis, Firebase, etc.)
// para que os estados dos usuários não se percam se o servidor reiniciar.
// Para este exemplo, usaremos um objeto simples na memória.
const userStates = {};

// --- MENSAGENS E MENUS CENTRALIZADOS ---
// (Facilita a manutenção)
const messages = {
  welcome:
    "Olá! 👋 Vi que você veio do Facebook e tem interesse em nossos fliperamas. Que legal! Sou seu assistente virtual e vou te ajudar a encontrar tudo o que precisa.\n\n" +
    "Para começarmos, me diga o que você gostaria de fazer:\n\n" +
    "1️⃣ - Ver modelos e preços\n" +
    "2️⃣ - Ver opções de estampas\n" +
    "3️⃣ - Suporte Técnico\n" +
    "4️⃣ - Falar com um atendente",

  selectProductType:
    "Legal! Para começar, me diga o que você procura:\n\n" +
    "1️⃣ - Fliperama Completo (com jogos)\n" +
    "2️⃣ - Apenas Controle USB (para PC/Fightcade, sem jogos)\n\n" +
    "Digite *voltar* para o menu anterior.",

  selectPlayerCount:
    "Entendido! E você precisa para quantos jogadores?\n\n" +
    "1️⃣ - Para 1 Jogador\n" +
    "2️⃣ - Para 2 Jogadores\n\n" +
    "Digite *voltar* para o menu anterior.",

  selectMaterial:
    "Perfeito! Qual material você prefere?\n\n" +
    "1️⃣ - MDF (Mais econômico)\n" +
    "2️⃣ - Metal (Mais robusto)\n\n" +
    "Digite *voltar* para o menu anterior.",

  printsInfo:
    "A personalização é a parte mais divertida! Você pode escolher entre dezenas de estampas para deixar o fliperama com a sua cara.\n\n" +
    "🎥 Veja o vídeo com algumas estampas incríveis!\n" +
    "👉 https://acesse.one/fightarcadeestampa\n\n" +
    "Depois de ver as estampas, digite *menu* para continuar.",

  supportInfo:
    "Entendo que precisa de ajuda. Para facilitar, criamos uma página com vídeos e tutoriais para os problemas mais comuns. Por favor, acesse:\n\n" +
    "🔧 CENTRAL DE AJUDA 🔧\n" +
    "👉 https://seusite.com/suporte\n\n" +
    "Se não encontrar a solução, digite *4* para falar com um especialista.",

  humanTransfer:
    "Tudo bem! Já estou transferindo sua conversa para um de nossos especialistas. Por favor, aguarde um momento. 🙂",
  
  invalidOption:
    "Opção inválida. Por favor, escolha uma das opções do menu acima.",

  // Preços
  price_arcade_1p_mdf: "Perfeito! Para o Fliperama de 1 Jogador em MDF:\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 550",
  price_arcade_1p_metal: "Excelente! Para o Fliperama de 1 Jogador em Metal:\n🕹️ Mecânico: R$ 599\n✨ Óptico: R$ 650",
  price_arcade_2p_mdf: "Show! Para o Fliperama de 2 Jogadores em MDF:\n🕹️ Mecânico: R$ 599\n✨ Óptico: R$ 699",
  price_arcade_2p_metal: "Ótima pedida! Para o Fliperama de 2 Jogadores em Metal:\n🕹️ Mecânico: R$ 699\n✨ Óptico: R$ 799",
  price_usb_1p: "Controle USB 1 Jogador:\n\nMDF:\n🕹️ Mecânico: R$ 299\n✨ Óptico: R$ 350\n🚀 Óptico Pico: R$ 450\n\nMetal:\n🕹️ Mecânico: R$ 399\n✨ Óptico: R$ 450",
  price_usb_2p: "Controle USB 2 Jogadores:\n\nMDF:\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 599\n\nMetal:\n🕹️ Mecânico: R$ 650\n✨ Óptico: R$ 750"
};

// --- FUNÇÃO PRINCIPAL DO CHATBOT ---
export function handleFightArcadeMessage(msg, client) {
  const userId = msg.from;
  const text = msg.body.trim().toLowerCase();
  
  // Garante que o estado do usuário exista. O estado inicial é 'GREETING'.
  const currentState = userStates[userId] || 'GREETING';

  // --- Comandos Globais ---
  if (text.match(/^(menu|início|start|oi|olá|ola)/i)) {
    client.sendMessage(userId, messages.welcome);
    userStates[userId] = 'MAIN_MENU';
    return;
  }
  if (text === 'voltar') {
      // Por simplicidade, 'voltar' sempre retorna ao menu principal.
      client.sendMessage(userId, "Voltando ao menu principal...");
      client.sendMessage(userId, messages.welcome);
      userStates[userId] = 'MAIN_MENU';
      return;
  }

  // --- Lógica baseada no estado atual do usuário ---
  switch (currentState) {
    
    case 'GREETING':
      // Qualquer mensagem aqui (que não seja um comando global) inicia o bot.
      client.sendMessage(userId, messages.welcome);
      userStates[userId] = 'MAIN_MENU';
      break;

    case 'MAIN_MENU':
      if (text === '1') {
        client.sendMessage(userId, messages.selectProductType);
        userStates[userId] = 'SELECT_PRODUCT_TYPE';
      } else if (text === '2') {
        client.sendMessage(userId, messages.printsInfo);
        userStates[userId] = 'MAIN_MENU'; // Retorna ao menu após mostrar info
      } else if (text === '3') {
        client.sendMessage(userId, messages.supportInfo);
        userStates[userId] = 'MAIN_MENU'; // Retorna ao menu após mostrar info
      } else if (text === '4') {
        client.sendMessage(userId, messages.humanTransfer);
        delete userStates[userId]; // Limpa o estado para atendimento humano
      } else {
        client.sendMessage(userId, messages.invalidOption);
      }
      break;

    case 'SELECT_PRODUCT_TYPE':
      if (text === '1') {
        client.sendMessage(userId, messages.selectPlayerCount);
        userStates[userId] = 'SELECT_PLAYERS_ARCADE';
      } else if (text === '2') {
        client.sendMessage(userId, messages.selectPlayerCount);
        userStates[userId] = 'SELECT_PLAYERS_USB';
      } else {
        client.sendMessage(userId, messages.invalidOption);
      }
      break;

    case 'SELECT_PLAYERS_ARCADE':
      if (text === '1') {
        client.sendMessage(userId, messages.selectMaterial);
        userStates[userId] = 'SELECT_MATERIAL_ARCADE_1P';
      } else if (text === '2') {
        client.sendMessage(userId, messages.selectMaterial);
        userStates[userId] = 'SELECT_MATERIAL_ARCADE_2P';
      } else {
        client.sendMessage(userId, messages.invalidOption);
      }
      break;

    case 'SELECT_MATERIAL_ARCADE_1P':
      let price1P = text === '1' ? messages.price_arcade_1p_mdf : messages.price_arcade_1p_metal;
      client.sendMessage(userId, price1P);
      client.sendMessage(userId, messages.welcome); // Mostra o menu principal de novo
      userStates[userId] = 'MAIN_MENU';
      break;
      
    case 'SELECT_MATERIAL_ARCADE_2P':
      let price2P = text === '1' ? messages.price_arcade_2p_mdf : messages.price_arcade_2p_metal;
      client.sendMessage(userId, price2P);
      client.sendMessage(userId, messages.welcome); // Mostra o menu principal de novo
      userStates[userId] = 'MAIN_MENU';
      break;

    case 'SELECT_PLAYERS_USB':
      let priceUSB = text === '1' ? messages.price_usb_1p : messages.price_usb_2p;
      client.sendMessage(userId, priceUSB);
      client.sendMessage(userId, messages.welcome); // Mostra o menu principal de novo
      userStates[userId] = 'MAIN_MENU';
      break;

    default:
      // Se por algum motivo o estado for inválido, reseta para o início.
      client.sendMessage(userId, "Ops, me perdi aqui. Vamos começar de novo.");
      client.sendMessage(userId, messages.welcome);
      userStates[userId] = 'MAIN_MENU';
      break;
  }
}
