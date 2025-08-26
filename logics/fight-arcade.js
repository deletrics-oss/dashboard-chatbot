// logics/fight-arcade.js
// Versão revisada e robusta do fluxo Fight Arcade
// - state machine por usuário
// - evita duplicação de processamento (msg.id)
// - proteção contra dupla anexação de handler

function nowIso() { return new Date().toISOString(); }

const DEFAULT_INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos

module.exports = function attachLogic(client, io, clientSession = {}, addEntry = () => {}) {
  // evita múltiplos attachs
  if (client._fightArcadeAttached) return;
  client._fightArcadeAttached = true;

  // LINKS (edite se necessário)
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

  // Session storage (usa clientSession passado pelo servidor para persistência entre módulos)
  clientSession.sessions = clientSession.sessions || { userStates: {} };
  const userStates = clientSession.sessions.userStates;

  // Set de mensagens processadas para evitar duplicatas
  clientSession._processedIds = clientSession._processedIds || new Set();
  const processedIds = clientSession._processedIds;
  const MAX_PROCESSED = 2000;

  // util: registra mensagem de bot no dashboard (usa addEntry)
  async function sendAndLog(user, text) {
    try {
      await client.sendMessage(user, text);
      addEntry('message', {
        from: 'Bot',
        to: user.replace('@c.us', ''),
        body: text,
        type: 'bot'
      });
    } catch (err) {
      addEntry('log', { level: 'error', message: `Erro ao enviar mensagem: ${err.message}`, data: { user, text } });
    }
  }

  function sendMainMenuText() {
    return "O que gostaria de fazer agora?\n\n" +
      "1️⃣ - Ver modelos e preços\n" +
      "2️⃣ - Ver opções de estampas\n" +
      "3️⃣ - Suporte Técnico\n" +
      "4️⃣ - Finalizar compra\n" +
      "5️⃣ - Falar com um atendente";
  }

  async function sendMainMenu(user, intro = "") {
    userStates[user] = userStates[user] || { stage: 'inicio', data: {}, lastSeen: Date.now() };
    userStates[user].stage = 'aguardando_menu_principal';
    userStates[user].data = {};
    await sendAndLog(user, (intro ? intro + "\n\n" : "") + sendMainMenuText());
  }

  async function handleModelResponse(user, state) {
    const tipo = state.tipo_produto;
    const jog = state.jogadores;
    const mat = state.material; // 'mdf' | 'metal'

    let response = "Desculpe, não encontrei uma combinação para essa escolha. Digite *menu* para voltar ao início.";

    if (tipo === 'fliperama') {
      if (jog === '1' && mat === 'mdf') {
        response = `*Fliperama 1 Jogador em MDF:*\n🕹️ Comando Mecânico: R$ 499\n✨ Comando Óptico: R$ 550\nVeja mais em: ${LINKS.SITE_MDF}`;
      } else if (jog === '1' && mat === 'metal') {
        response = `*Fliperama 1 Jogador em Metal:*\n🕹️ Comando Mecânico: R$ 599\n✨ Comando Óptico: R$ 650\nVeja mais em: ${LINKS.SITE_METAL}`;
      } else if (jog === '2' && mat === 'mdf') {
        response = `*Fliperama 2 Jogadores em MDF:*\n🕹️ Comandos Mecânicos: R$ 599\n✨ Comandos Ópticos: R$ 699\nVeja mais em: ${LINKS.SITE_MDF}`;
      } else if (jog === '2' && mat === 'metal') {
        response = `*Fliperama 2 Jogadores em Metal:*\n🕹️ Comandos Mecânicos: R$ 699\n✨ Comandos Ópticos: R$ 799\nVeja mais em: ${LINKS.SITE_METAL}`;
      }
    } else if (tipo === 'usb') {
      if (jog === '1') {
        response = "Ok! Para Controle USB de 1 Jogador:\n\nEm MDF:\n🕹️ Mecânico: R$ 299\n✨ Óptico: R$ 350\n🚀 Óptico com Placa Pico: R$ 450\n\nEm Metal:\n🕹️ Mecânico: R$ 399\n✨ Óptico: R$ 450";
      } else if (jog === '2') {
        response = "Certo! Para Controle USB de 2 Jogadores:\n\nEm MDF:\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 599\n\nEm Metal:\n🕹️ Mecânico: R$ 650\n✨ Óptico: R$ 750";
      }
    }

    await sendAndLog(user, response);

    // mensagem final com extras e CTA
    if (!response.startsWith("Desculpe")) {
      const extras = 
`Qual a diferença entre os comandos? 🤔
O comando mecânico usa micro-switches (peças físicas). O comando óptico usa sensores de luz: mais precisão e durabilidade.

🎨 Personalize:
Escolha entre quase 70 estampas: ${LINKS.CATALOGO_ESTAMPAS}

O que você gostaria de fazer agora?
1️⃣ - Ver estampas
2️⃣ - Finalizar compra
3️⃣ - Falar com atendente`;
      await sendAndLog(user, extras);
    }

    // volta ao início para nova interação
    userStates[user].stage = 'inicio';
    userStates[user].data = {};
  }

  async function handleSupportTopic(user, topic) {
    // topic is string '1'..'11'
    const t = topic;
    const base = msgWrap => sendAndLog(user, msgWrap);

    switch (t) {
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
• Interferência de luz — isole frestas; ajuste o trimpot (pequeno potenciômetro azul) com cuidado.

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

  // limpeza periódica de estados (usuarios inativos e processedIds)
  setInterval(() => {
    const cutoff = Date.now() - DEFAULT_INACTIVITY_MS;
    for (const [user, state] of Object.entries(userStates)) {
      if (!state.lastSeen) continue;
      if (state.lastSeen < cutoff) {
        delete userStates[user];
        addEntry('log', { level: 'info', message: `Estado do usuário limpo por inatividade: ${user}` });
      }
    }
    if (processedIds.size > MAX_PROCESSED) {
      // esvazia metade para liberar memória
      let i = 0;
      const toRemove = Math.floor(processedIds.size / 2);
      for (const id of processedIds) {
        processedIds.delete(id);
        if (++i >= toRemove) break;
      }
    }
  }, 5 * 60 * 1000); // a cada 5 minutos

  // Handler principal de mensagens
  client.on('message', async (msg) => {
    try {
      // só processa conversas 1:1
      if (!msg.from || !msg.from.endsWith('@c.us')) return;

      // evita mensagens sem corpo (ex.: só mídia)
      if (!msg.body || typeof msg.body !== 'string') return;

      const msgId = (msg.id && (msg.id._serialized || msg.id.id)) ? (msg.id._serialized || msg.id.id) : null;
      if (msgId) {
        if (processedIds.has(msgId)) {
          // mensagem processada antes -> ignora
          return;
        }
        processedIds.add(msgId);
      }

      // limite do set
      if (processedIds.size > MAX_PROCESSED) {
        // remove primeiro (iterativo)
        const it = processedIds.values();
        processedIds.delete(it.next().value);
      }

      const user = msg.from;
      const bodyRaw = msg.body.trim();
      if (!bodyRaw) return;
      const body = bodyRaw.toLowerCase();

      const contact = await msg.getContact();
      const contactName = contact && contact.pushname ? contact.pushname : user.replace('@c.us', '');

      // log da mensagem do usuário no dashboard
      addEntry('message', { from: contactName, body: bodyRaw, type: 'user' });

      // inicializa estado do usuário
      userStates[user] = userStates[user] || { stage: 'inicio', data: {}, lastSeen: Date.now() };
      const state = userStates[user];
      state.lastSeen = Date.now();

      // se o usuário estiver muito inativo, reinicia o fluxo
      if (state.lastSeen && (Date.now() - state.lastSeen) > DEFAULT_INACTIVITY_MS) {
        state.stage = 'inicio';
        state.data = {};
      }

      // Saudação / atalho para menu
      if (body.match(/^(oi|olá|ola|bom dia|boa tarde|boa noite|menu|começar|start|início)$/i)) {
        const chat = await msg.getChat();
        if (chat && chat.sendStateTyping) await chat.sendStateTyping();
        await sendAndLog(user, `Olá, ${contactName.split(' ')[0]}! 👋 Sou o assistente virtual da Fight Arcade.`);
        await sendMainMenu(user);
        return;
      }

      // processamento por estágios
      switch (state.stage) {
        case 'aguardando_menu_principal': {
          // aceita 1..5 ou palavras-chave
          if (['1','2','3','4','5'].includes(body)) {
            if (body === '1') {
              state.stage = 'aguardando_tipo_produto';
              state.data = {};
              await sendAndLog(user, "Legal! Para começar, me diga o que você procura:\n\n1️⃣ - Fliperama Completo (com jogos)\n2️⃣ - Apenas Controle USB (para PC/Fightcade, sem jogos)\n0️⃣ - Voltar ao menu principal");
              return;
            }
            if (body === '2') {
              state.stage = 'aguardando_estampas';
              await sendAndLog(user,
`A personalização é a parte mais divertida! 🎨
Veja o vídeo / catálogo: ${LINKS.CATALOGO_ESTAMPAS}

1️⃣ - Finalizar compra
2️⃣ - Ver modelos de novo
3️⃣ - Falar com atendente`);
              return;
            }
            if (body === '3') {
              state.stage = 'aguardando_suporte_topic';
              await sendAndLog(user,
`Entendo que precisa de ajuda. Selecione:
1 - Comando não funciona
2 - Comando andando sozinho
3 - Botões não funcionam
4 - Fliperama não liga / inicializa
5 - HDMI não funciona
6 - Fonte não funciona
7 - Alterar configurações dos controles
8 - Como utilizar o fliperama
9 - Como adicionar mais jogos
10 - Como instalar um controle adicional
11 - Como regravar o sistema
0 - Voltar ao menu principal`);
              return;
            }
            if (body === '4') {
              state.stage = 'aguardando_finalizar';
              await sendAndLog(user,
`Para finalizar sua compra:
1️⃣ - Comprar Online (Mercado Livre / Shopee)
2️⃣ - Finalizar com Atendente`);
              return;
            }
            if (body === '5') {
              state.stage = 'transferring_to_agent';
              await sendAndLog(user, "Tudo bem! Já estou transferindo sua conversa para um de nossos especialistas. Por favor, aguarde um momento. 🙂");
              // aqui você pode disparar lógica de transferir para atendente real
              return;
            }
          } else {
            // aceita palavras-chave para facilitar o usuário
            if (body.includes('fliperama')) {
              state.stage = 'aguardando_tipo_produto';
              state.data = {};
              await sendAndLog(user, "Entendi: Fliperama. Você prefere:\n1️⃣ - Fliperama Completo\n2️⃣ - Apenas Controle USB\n0️⃣ - Voltar");
              return;
            }
            if (body.includes('estampa') || body.includes('estampas')) {
              state.stage = 'aguardando_estampas';
              await sendAndLog(user, `Catálogo de estampas: ${LINKS.CATALOGO_ESTAMPAS}\n1️⃣ - Finalizar compra\n2️⃣ - Ver modelos de novo\n3️⃣ - Falar com atendente`);
              return;
            }
            // não entendeu -> pedir para usar menu
            await sendAndLog(user, "Opção não reconhecida. Digite *menu* ou envie 1,2,3,4 ou 5.");
            return;
          }
          break;
        }

        case 'aguardando_tipo_produto': {
          if (body === '0') { await sendMainMenu(user); return; }
          if (body === '1' || body.includes('fliperama')) {
            state.data.tipo_produto = 'fliperama';
            state.stage = 'aguardando_jogadores';
            await sendAndLog(user, "Certo, Fliperama Completo. Para quantos jogadores?\n1️⃣ - 1 Jogador\n2️⃣ - 2 Jogadores\n0️⃣ - Voltar");
            return;
          }
          if (body === '2' || body.includes('controle') || body.includes('usb')) {
            state.data.tipo_produto = 'usb';
            state.stage = 'aguardando_jogadores';
            await sendAndLog(user, "Entendido, Controle USB. Para quantos jogadores?\n1️⃣ - 1 Jogador\n2️⃣ - 2 Jogadores\n0️⃣ - Voltar");
            return;
          }
          await sendAndLog(user, "Opção inválida. Digite 1 (Fliperama) ou 2 (Controle USB) ou 0 para voltar.");
          return;
        }

        case 'aguardando_jogadores': {
          if (body === '0') { state.stage = 'aguardando_tipo_produto'; await sendAndLog(user, "Voltando..."); return; }
          if (!['1','2'].includes(body)) { await sendAndLog(user, "Escolha 1 (1 jogador) ou 2 (2 jogadores) ou 0 para voltar."); return; }

          state.data.jogadores = body; // '1' ou '2'

          if (state.data.tipo_produto === 'fliperama') {
            state.stage = 'aguardando_material';
            await sendAndLog(user, "Ótimo! E qual material você prefere para o gabinete?\n1️⃣ - MDF (Clássico)\n2️⃣ - Metal (Ultra Resistente)\n0️⃣ - Voltar");
            return;
          }

          // se for USB -> já responde com as opções de USB
          if (state.data.tipo_produto === 'usb') {
            const jog = state.data.jogadores;
            if (jog === '1') {
              await sendAndLog(user,
`Ok! Para Controle USB de 1 Jogador:

Em MDF:
🕹️ Mecânico: R$ 299
✨ Óptico: R$ 350
🚀 Óptico com Placa Pico: R$ 450

Em Metal:
🕹️ Mecânico: R$ 399
✨ Óptico: R$ 450

Deseja:
1️⃣ - Ver estampas
2️⃣ - Finalizar compra
3️⃣ - Falar com atendente`);
            } else {
              await sendAndLog(user,
`Certo! Para Controle USB de 2 Jogadores:

Em MDF:
🕹️ Mecânico: R$ 499
✨ Óptico: R$ 599

Em Metal:
🕹️ Mecânico: R$ 650
✨ Óptico: R$ 750

Deseja:
1️⃣ - Ver estampas
2️⃣ - Finalizar compra
3️⃣ - Falar com atendente`);
            }
            state.stage = 'inicio'; // volta ao início pós-resposta
            state.data = {};
            return;
          }
          break;
        }

        case 'aguardando_material': {
          if (body === '0') { state.stage = 'aguardando_jogadores'; await sendAndLog(user, "Voltando aos jogadores..."); return; }
          if (!['1','2'].includes(body)) { await sendAndLog(user, "Escolha 1 (MDF) ou 2 (Metal) ou 0 para voltar."); return; }
          state.data.material = body === '1' ? 'mdf' : 'metal';
          // envia resposta final dependendo de tipo/jogadores/material
          await handleModelResponse(user, {
            tipo_produto: state.data.tipo_produto,
            jogadores: state.data.jogadores,
            material: state.data.material
          });
          return;
        }

        case 'aguardando_estampas': {
          if (['1','2','3'].includes(body)) {
            if (body === '1') {
              await sendAndLog(user, `Para finalizar: \nMercado Livre: ${LINKS.MERCADO_LIVRE}\nShopee: ${LINKS.SHOPEE}\nSite: ${LINKS.SITE_MDF}`);
              state.stage = 'inicio';
              state.data = {};
              return;
            }
            if (body === '2') { await sendMainMenu(user); return; }
            if (body === '3') { await sendAndLog(user, "Transferindo para atendente..."); state.stage = 'transferring_to_agent'; return; }
          }
          // aceitar também 'video' ou link
          if (body.includes('video') || body.includes('vídeo')) {
            await sendAndLog(user, `Vídeo com estampas: ${LINKS.CATALOGO_ESTAMPAS}`);
            return;
          }
          await sendAndLog(user, "Escolha 1 (Finalizar), 2 (Ver modelos) ou 3 (Falar com atendente).");
          return;
        }

        case 'aguardando_suporte_topic': {
          if (body === '0') { await sendMainMenu(user); return; }
          if (/^[1-9]$/.test(body) || body === '10' || body === '11') {
            await handleSupportTopic(user, body);
            state.stage = 'inicio';
            state.data = {};
            return;
          }
          await sendAndLog(user, "Escolha uma opção de 1 a 11 ou 0 para voltar.");
          return;
        }

        case 'aguardando_finalizar': {
          if (body === '1') {
            await sendAndLog(user, `Compra online:\nMercado Livre: ${LINKS.MERCADO_LIVRE}\nShopee: ${LINKS.SHOPEE}\nSite: ${LINKS.SITE_MDF}`);
            state.stage = 'inicio';
            state.data = {};
            return;
          }
          if (body === '2') {
            await sendAndLog(user, "Ok, vou encaminhar para um atendente. Aguarde...");
            state.stage = 'transferring_to_agent';
            return;
          }
          await sendAndLog(user, "Escolha 1 (Comprar online) ou 2 (Finalizar com atendente).");
          return;
        }

        case 'transferring_to_agent': {
          // se já em transferência, respostas automáticas
          await sendAndLog(user, "Já estou tentando transferir para um atendente. Por favor aguarde.");
          return;
        }

        default: {
          // estado 'inicio' ou desconhecido: se usuário enviar 1..5 podemos encaminhar como se tivesse pedido no menu
          if (['1','2','3','4','5'].includes(body)) {
            // forçar stage para processar como se estivesse no menu
            state.stage = 'aguardando_menu_principal';
            // re-disparar processamento do mesmo evento (simples re-call: chamar a função recursivamente)
            // para evitar loops, fazemos uma chamada direta simples:
            // executar o mesmo handler do menu:
            if (body === '1') {
              state.stage = 'aguardando_tipo_produto';
              state.data = {};
              await sendAndLog(user, "Legal! Para começar, me diga o que você procura:\n\n1️⃣ - Fliperama Completo (com jogos)\n2️⃣ - Apenas Controle USB (para PC/Fightcade, sem jogos)\n0️⃣ - Voltar ao menu principal");
              return;
            }
            if (body === '2') {
              state.stage = 'aguardando_estampas';
              await sendAndLog(user,
`A personalização é a parte mais divertida! 🎨
Veja: ${LINKS.CATALOGO_ESTAMPAS}

1️⃣ - Finalizar compra
2️⃣ - Ver modelos de novo
3️⃣ - Falar com atendente`);
              return;
            }
            if (body === '3') {
              state.stage = 'aguardando_suporte_topic';
              await sendAndLog(user,
`Selecione o problema:
1 - Comando não funciona
2 - Comando andando sozinho
3 - Botões não funcionam
4 - Fliperama não liga / inicializa
5 - HDMI não funciona
6 - Fonte não funciona
7 - Alterar configurações dos controles
8 - Como utilizar o fliperama
9 - Como adicionar mais jogos
10 - Como instalar um controle adicional
11 - Como regravar o sistema
0 - Voltar`);
              return;
            }
            if (body === '4') {
              state.stage = 'aguardando_finalizar';
              await sendAndLog(user, "Para finalizar sua compra:\n1️⃣ - Comprar Online\n2️⃣ - Finalizar com Atendente");
              return;
            }
            if (body === '5') {
              state.stage = 'transferring_to_agent';
              await sendAndLog(user, "Transferindo para atendente...");
              return;
            }
          }
          // Se não foi um número ou não entendido
          await sendAndLog(user, "Desculpe, não entendi. Digite *menu* ou envie 1,2,3,4 ou 5 para começar.");
          return;
        }
      } // fim switch

    } catch (err) {
      addEntry('log', { level: 'error', message: `Erro no processamento da mensagem: ${err.message}`, data: { stack: err.stack } });
    }
  });

}; // fim attachLogic
