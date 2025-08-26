// logics/fight-arcade.js
// Versão revisada e robusta do fluxo Fight Arcade
// - state machine por usuário
// - evita duplicação de processamento (msg.id)
// - proteção contra dupla anexação de handler

function nowIso() { return new Date().toISOString(); }

module.exports = function attachLogic(client, io, clientSession = {}, addEntry = () => {}) {
  // evita múltiplos attachs
  if (client._fightArcadeAttached) return;
  client._fightArcadeAttached = true;

  const LINKS = {
    MERCADO_LIVRE: "https://www.mercadolivre.com.br/perfil/FIGHTARCADE",
    SHOPEE: "https://acesse.one/fliperamasnashopee",
    SITE_MDF: "https://www.fightarcade.com.br/mdf/",
    SITE_METAL: "https://www.fightarcade.com.br/metal/",
    CATALOGO_ESTAMPAS: "https://acesse.one/fightarcadeestampa",
    GRUPO_WHATSAPP: "https://chat.whatsapp.com/EqOUWXbKhHB6FrFdfogjRC",
    VENDAS_DIRETAS_WHATSAPP: "https://wa.me/5511984343166",
    TUTORIAL_BOTOES: "https://sl1nk.com/alterarbotoesdentrodojogo",
    MANUAL_USO: "https://l1q.com/manualfightarcade",
    TUTORIAL_JOGOS: "https://sl1nk.com/adicionarouremoverjogos",
    TUTORIAL_CONTROLES_NOVOS: "https://sl1nk.com/configurarcontrolesnovos",
    TUTORIAL_RECUPERAR_SISTEMA: "https://sl1nk.com/recuperarosistema"
  };

  // use clientSession provided by server to persist state across modules
  clientSession.sessions = clientSession.sessions || { userStates: {} };
  const userStates = clientSession.sessions.userStates;

  // set de mensagens processadas para evitar duplicacao
  clientSession._processedIds = clientSession._processedIds || new Set();
  const processedIds = clientSession._processedIds;
  const MAX_PROCESSED = 2000;

  // util: envia msg e adiciona ao dashboard via addEntry
  async function sendAndLog(user, text) {
    try {
      await client.sendMessage(user, text);
      addEntry('message', { from: 'Bot', to: user.replace('@c.us', ''), body: text, type: 'bot' });
      // se o servidor expõe io.logSession, usa para gravar arquivo
      try { if (io && io.logSession) io.logSession(user.replace('@c.us',''), `BOT: ${text}`); } catch(e){}
    } catch (err) {
      addEntry('log', { level: 'error', message: `Erro ao enviar mensagem: ${err.message}`, data: { user, text } });
    }
  }

  function mainMenuText(){
    return "O que gostaria de fazer agora?\n\n1️⃣ - Ver modelos e preços\n2️⃣ - Ver opções de estampas\n3️⃣ - Suporte Técnico\n4️⃣ - Finalizar compra\n5️⃣ - Falar com um atendente";
  }

  async function sendMainMenu(user, intro = "") {
    userStates[user] = userStates[user] || { stage: 'inicio', data: {}, lastSeen: Date.now() };
    userStates[user].stage = 'aguardando_menu_principal';
    userStates[user].data = {};
    await sendAndLog(user, (intro ? intro + "\n\n" : "") + mainMenuText());
  }

  async function handleModelResponse(user, state) {
    const tipo = state.tipo_produto;
    const jog = state.jogadores;
    const mat = state.material;
    let response = "Desculpe, não encontrei uma combinação para essa escolha. Digite *menu* para voltar ao início.";

    if (tipo === 'fliperama') {
      if (jog === '1' && mat === 'mdf') response = `*Fliperama 1 Jogador em MDF:*\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 550\nVeja: ${LINKS.SITE_MDF}`;
      else if (jog === '1' && mat === 'metal') response = `*Fliperama 1 Jogador em Metal:*\n🕹️ Mecânico: R$ 599\n✨ Óptico: R$ 650\nVeja: ${LINKS.SITE_METAL}`;
      else if (jog === '2' && mat === 'mdf') response = `*Fliperama 2 Jogadores em MDF:*\n🕹️ Mecânico: R$ 599\n✨ Óptico: R$ 699\nVeja: ${LINKS.SITE_MDF}`;
      else if (jog === '2' && mat === 'metal') response = `*Fliperama 2 Jogadores em Metal:*\n🕹️ Mecânico: R$ 699\n✨ Óptico: R$ 799\nVeja: ${LINKS.SITE_METAL}`;
    } else if (tipo === 'usb') {
      if (jog === '1') response = "Ok! Controle USB 1 Jogador:\n\nMDF:\n🕹️ Mecânico: R$ 299\n✨ Óptico: R$ 350\n🚀 Óptico Pico: R$ 450\n\nMetal:\n🕹️ Mecânico: R$ 399\n✨ Óptico: R$ 450";
      else if (jog === '2') response = "Controle USB 2 Jogadores:\n\nMDF:\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 599\n\nMetal:\n🕹️ Mecânico: R$ 650\n✨ Óptico: R$ 750";
    }

    await sendAndLog(user, response);

    if (!response.startsWith("Desculpe")) {
      const extras = `Qual a diferença entre os comandos? 🤔\nO comando mecânico usa micro-switches. O óptico usa sensores de luz.\n\n🎨 Personalize: ${LINKS.CATALOGO_ESTAMPAS}\n\n1️⃣ - Ver estampas\n2️⃣ - Finalizar compra\n3️⃣ - Falar com atendente`;
      await sendAndLog(user, extras);
    }

    userStates[user].stage = 'inicio';
    userStates[user].data = {};
  }

  async function handleSupportTopic(user, topic) {
    switch (topic) {
      case '1':
        await sendAndLog(user,
`Ok, vamos resolver isso! Geralmente é algo simples. Por favor, siga estes passos:

• Verifique os fios: retire a tampa traseira e verifique conexões.
• Cheque a placa: veja se o LED de energia está aceso.
• Teste o hub USB (se for 2 players): conecte direto na placa principal para testar.

Se não resolver, digite 0 para voltar e peça atendimento.`);
        break;
      case '2':
        await sendAndLog(user,
`Comando andando sozinho — possíves causas:

Se MECÂNICO:
• Micro-switch desalinhada — abra e ajuste a haste.

Se ÓPTICO:
• Interferência de luz — isole frestas; ajuste o trimpot azul com cuidado.

Se continuar, digite 0 para falar com atendente.`);
        break;
      case '3':
        await sendAndLog(user,
`Botões não funcionam — cheque fios soltos na placa 'zero delay' e no próprio botão. Reencaixe e teste. Se persistir, digite 0 para falar com atendente.`);
        break;
      case '4':
      case '6':
        await sendAndLog(user,
`Fliperama não liga / Fonte:

• Verifique a tomada e cabo.
• Teste outra fonte 12V (1A/2A/3A). Para teste rápido pode usar 5V 2A, mas só temporário.
• Se confirmar defeito, digite 0 e peça atendimento para troca.`);
        break;
      case '5':
        await sendAndLog(user,
`HDMI não funciona — troque o cabo, mude de porta HDMI na TV, teste outra TV. Se persistir, fale com atendente.`);
        break;
      case '7':
        await sendAndLog(user,
`Alterar configurações dos controles:
Normalmente se altera dentro do jogo. Guia: ${LINKS.TUTORIAL_BOTOES}`);
        break;
      case '8':
        await sendAndLog(user, `Manual de uso completo: ${LINKS.MANUAL_USO}`);
        break;
      case '9':
        await sendAndLog(user, `Como adicionar/remover jogos: ${LINKS.TUTORIAL_JOGOS}`);
        break;
      case '10':
        await sendAndLog(user, `Como instalar controle adicional: ${LINKS.TUTORIAL_CONTROLES_NOVOS}`);
        break;
      case '11':
        await sendAndLog(user, `Como regravar o sistema (recuperar): ${LINKS.TUTORIAL_RECUPERAR_SISTEMA}`);
        break;
      default:
        await sendAndLog(user, "Opção inválida em suporte. Digite 1-11 ou 0 para voltar.");
        break;
    }
  }

  // cleanup: limpa processedIds e sessões antigas periodicamente
  setInterval(() => {
    if (processedIds.size > MAX_PROCESSED) {
      const remove = Math.floor(processedIds.size / 2);
      let i = 0;
      for (const id of processedIds) { processedIds.delete(id); if (++i >= remove) break; }
    }
    // limpa usuários inativos há mais de 24h
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    for (const [u, st] of Object.entries(userStates)) {
      if (st.lastSeen && st.lastSeen < cutoff) delete userStates[u];
    }
  }, 5 * 60 * 1000);

  // handler principal
  client.on('message', async (msg) => {
    try {
      if (!msg.from || !msg.from.endsWith('@c.us')) return;
      if (!msg.body || typeof msg.body !== 'string') return;

      const msgId = (msg.id && (msg.id._serialized || msg.id.id)) ? (msg.id._serialized || msg.id.id) : null;
      if (msgId && processedIds.has(msgId)) return;
      if (msgId) processedIds.add(msgId);

      // throttle processedIds size
      if (processedIds.size > MAX_PROCESSED) {
        const it = processedIds.values();
        processedIds.delete(it.next().value);
      }

      const user = msg.from;
      const bodyRaw = msg.body.trim();
      if (!bodyRaw) return;
      const body = bodyRaw.toLowerCase();

      const contact = await msg.getContact();
      const contactName = contact && contact.pushname ? contact.pushname : user.replace('@c.us', '');

      // log mensagem do usuário no dashboard
      addEntry('message', { from: contactName, body: bodyRaw, type: 'user' });
      try { if (io && io.logSession) io.logSession(user.replace('@c.us',''), `USER: ${bodyRaw}`); } catch(e){}

      // inicializa estado do usuário
      userStates[user] = userStates[user] || { stage: 'inicio', data: {}, lastSeen: Date.now() };
      const state = userStates[user];
      state.lastSeen = Date.now();

      // saudação / menu shortcut
      if (body.match(/^(oi|olá|ola|bom dia|boa tarde|boa noite|menu|começar|start|início)$/i)) {
        const chat = await msg.getChat(); if (chat && chat.sendStateTyping) await chat.sendStateTyping();
        await sendAndLog(user, `Olá, ${contactName.split(' ')[0]}! 👋 Sou o assistente virtual da Fight Arcade.`);
        await sendMainMenu(user);
        return;
      }

      // processamento por estágios
      switch (state.stage) {
        case 'aguardando_menu_principal': {
          if (['1','2','3','4','5'].includes(body)) {
            if (body === '1') { state.stage = 'aguardando_tipo_produto'; state.data = {}; await sendAndLog(user, "Legal! Para começar, me diga o que você procura:\n\n1️⃣ - Fliperama Completo (com jogos)\n2️⃣ - Apenas Controle USB (para PC/Fightcade, sem jogos)\n0️⃣ - Voltar"); return; }
            if (body === '2') { state.stage = 'aguardando_estampas'; await sendAndLog(user, `A personalização é a parte mais divertida! 🎨\nVeja: ${LINKS.CATALOGO_ESTAMPAS}\n\n1️⃣ - Finalizar compra\n2️⃣ - Ver modelos de novo\n3️⃣ - Falar com atendente`); return; }
            if (body === '3') { state.stage = 'aguardando_suporte_topic'; await sendAndLog(user, `Entendo que precisa de ajuda. Selecione 1..11 ou 0 para voltar.`); return; }
            if (body === '4') { state.stage = 'aguardando_finalizar'; await sendAndLog(user, `Para finalizar sua compra:\n1️⃣ - Comprar Online\n2️⃣ - Finalizar com Atendente`); return; }
            if (body === '5') { state.stage = 'transferring_to_agent'; await sendAndLog(user, "Transferindo para atendente..."); return; }
          } else {
            if (body.includes('fliperama')) { state.stage = 'aguardando_tipo_produto'; state.data = {}; await sendAndLog(user, "Entendi: Fliperama. Você prefere:\n1️⃣ - Fliperama Completo\n2️⃣ - Apenas Controle USB\n0️⃣ - Voltar"); return; }
            if (body.includes('estampa')||body.includes('estampas')) { state.stage='aguardando_estampas'; await sendAndLog(user, `Catálogo: ${LINKS.CATALOGO_ESTAMPAS}\n1️⃣ - Finalizar compra\n2️⃣ - Ver modelos\n3️⃣ - Falar com atendente`); return; }
            await sendAndLog(user, "Opção não reconhecida. Digite *menu* ou envie 1,2,3,4 ou 5."); return;
          }
        } break;

        case 'aguardando_tipo_produto': {
          if (body === '0') { await sendMainMenu(user); return; }
          if (body === '1' || body.includes('fliperama')) { state.data.tipo_produto = 'fliperama'; state.stage = 'aguardando_jogadores'; await sendAndLog(user, "Certo, Fliperama Completo. Para quantos jogadores?\n1️⃣ - 1 Jogador\n2️⃣ - 2 Jogadores\n0️⃣ - Voltar"); return; }
          if (body === '2' || body.includes('controle') || body.includes('usb')) { state.data.tipo_produto = 'usb'; state.stage = 'aguardando_jogadores'; await sendAndLog(user, "Entendido, Controle USB. Para quantos jogadores?\n1️⃣ - 1 Jogador\n2️⃣ - 2 Jogadores\n0️⃣ - Voltar"); return; }
          await sendAndLog(user, "Opção inválida. Digite 1 (Fliperama) ou 2 (Controle USB) ou 0 para voltar."); return;
        }

        case 'aguardando_jogadores': {
          if (body === '0') { state.stage = 'aguardando_tipo_produto'; await sendAndLog(user, "Voltando..."); return; }
          if (!['1','2'].includes(body)) { await sendAndLog(user, "Escolha 1 (1 jogador) ou 2 (2 jogadores) ou 0 para voltar."); return; }
          state.data.jogadores = body;
          if (state.data.tipo_produto === 'fliperama') { state.stage = 'aguardando_material'; await sendAndLog(user, "Ótimo! E qual material você prefere para o gabinete?\n1️⃣ - MDF (Clássico)\n2️⃣ - Metal (Ultra Resistente)\n0️⃣ - Voltar"); return; }
          if (state.data.tipo_produto === 'usb') {
            if (body === '1') await sendAndLog(user, `Ok! Para Controle USB de 1 Jogador:\n\nMDF:\n🕹️ Mecânico: R$ 299\n✨ Óptico: R$ 350\n🚀 Óptico Pico: R$ 450\n\nMetal:\n🕹️ Mecânico: R$ 399\n✨ Óptico: R$ 450\n\nDeseja:\n1️⃣ - Ver estampas\n2️⃣ - Finalizar compra\n3️⃣ - Falar com atendente`);
            else await sendAndLog(user, `Certo! Para Controle USB de 2 Jogadores:\n\nMDF:\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 599\n\nMetal:\n🕹️ Mecânico: R$ 650\n✨ Óptico: R$ 750\n\nDeseja:\n1️⃣ - Ver estampas\n2️⃣ - Finalizar compra\n3️⃣ - Falar com atendente`);
            state.stage = 'inicio'; state.data = {}; return;
          }
        } break;

        case 'aguardando_material': {
          if (body === '0') { state.stage = 'aguardando_jogadores'; await sendAndLog(user, "Voltando aos jogadores..."); return; }
          if (!['1','2'].includes(body)) { await sendAndLog(user, "Escolha 1 (MDF) ou 2 (Metal) ou 0 para voltar."); return; }
          state.data.material = body === '1' ? 'mdf' : 'metal';
          await handleModelResponse(user, { tipo_produto: state.data.tipo_produto, jogadores: state.data.jogadores, material: state.data.material });
          return;
        }

        case 'aguardando_estampas': {
          if (['1','2','3'].includes(body)) {
            if (body === '1') { await sendAndLog(user, `Para finalizar: \nMercado Livre: ${LINKS.MERCADO_LIVRE}\nShopee: ${LINKS.SHOPEE}\nSite: ${LINKS.SITE_MDF}`); state.stage = 'inicio'; state.data = {}; return; }
            if (body === '2') { await sendMainMenu(user); return; }
            if (body === '3') { await sendAndLog(user, "Transferindo para atendente..."); state.stage = 'transferring_to_agent'; return; }
          }
          if (body.includes('video') || body.includes('vídeo')) { await sendAndLog(user, `Vídeo com estampas: ${LINKS.CATALOGO_ESTAMPAS}`); return; }
          await sendAndLog(user, "Escolha 1 (Finalizar), 2 (Ver modelos) ou 3 (Falar com atendente)."); return;
        }

        case 'aguardando_suporte_topic': {
          if (body === '0') { await sendMainMenu(user); return; }
          if (/^[1-9]$/.test(body) || body === '10' || body === '11') { await handleSupportTopic(user, body); state.stage = 'inicio'; state.data = {}; return; }
          await sendAndLog(user, "Escolha uma opção de 1 a 11 ou 0 para voltar."); return;
        }

        case 'aguardando_finalizar': {
          if (body === '1') { await sendAndLog(user, `Compra online:\nMercado Livre: ${LINKS.MERCADO_LIVRE}\nShopee: ${LINKS.SHOPEE}\nSite: ${LINKS.SITE_MDF
