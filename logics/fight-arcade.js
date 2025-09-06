  /**
 * Lógica Melhorada para o bot Fight Arcade
 * Sistema de respostas inteligente com múltiplas funcionalidades
 */

export function handleFightArcadeMessage(msg, wweb) {
  try {
    console.log(`🎮 Fight Arcade - Nova mensagem de ${msg.from}: ${msg.body}`);
    
    const messageBody = msg.body.toLowerCase().trim();
    const userName = msg._data.notifyName || msg.from.split('@')[0];
    
    // Sistema de comandos mais robusto
    if (messageBody === 'oi' || messageBody === 'olá' || messageBody === 'hello' || messageBody === 'ola') {
      const welcomeMessages = [
        `🎮 Olá ${userName}! Bem-vindo ao Fight Arcade! 🕹️\n\nComo posso ajudar você hoje?\n\n🎯 Digite "menu" para ver nossas opções\n🕐 Digite "horario" para ver quando funcionamos\n💰 Digite "precos" para ver nossos valores`,
        `🎮 E aí ${userName}! Que bom te ver por aqui! 🎊\n\nO Fight Arcade está pronto para você!\n\n⚡ Digite "jogos" para ver nossa seleção\n🏆 Digite "torneios" para competições\n📞 Digite "contato" para falar conosco`
      ];
      msg.reply(welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]);
      
    } else if (messageBody.includes('menu') || messageBody.includes('opcoes') || messageBody.includes('opções')) {
      msg.reply(`🎮 *MENU FIGHT ARCADE* 🎮\n\n🕹️ *JOGOS DISPONÍVEIS:*\n• Street Fighter 6\n• Tekken 8\n• Mortal Kombat 1\n• King of Fighters XV\n• Guilty Gear Strive\n\n🏆 *SERVIÇOS:*\n• Jogo livre - R$ 5,00/hora\n• Torneios semanais\n• Aulas particulares\n• Festa de aniversário\n\n📱 Digite o nome do jogo ou serviço para mais info!`);
      
    } else if (messageBody.includes('horário') || messageBody.includes('horario') || messageBody.includes('funcionamento')) {
      msg.reply(`🕐 *HORÁRIO DE FUNCIONAMENTO*\n\n📅 *Segunda a Sexta:* 14h às 22h\n📅 *Sábado:* 10h às 24h\n📅 *Domingo:* 10h às 20h\n\n🎯 *HORÁRIOS ESPECIAIS:*\n• Happy Hour: Seg-Sex 14h-17h (50% desconto)\n• Madrugada: Sáb 22h-24h (jogos em dobro)\n\n⚡ Sempre aberto para diversão!`);
      
    } else if (messageBody.includes('preço') || messageBody.includes('preco') || messageBody.includes('valor') || messageBody.includes('quanto')) {
      msg.reply(`💰 *TABELA DE PREÇOS* 💰\n\n🕹️ *JOGO LIVRE:*\n• 1 hora: R$ 5,00\n• 3 horas: R$ 12,00\n• Dia inteiro: R$ 25,00\n\n🏆 *TORNEIOS:*\n• Inscrição: R$ 10,00\n• Prêmio: R$ 100,00 (1º lugar)\n\n🎓 *AULAS:*\n• Aula individual: R$ 30,00/hora\n• Pacote 4 aulas: R$ 100,00\n\n💳 Aceitamos PIX, dinheiro e cartão!`);
      
    } else if (messageBody.includes('jogo') || messageBody.includes('street fighter') || messageBody.includes('tekken') || messageBody.includes('mortal kombat')) {
      msg.reply(`🎮 *NOSSOS JOGOS* 🎮\n\n🥊 *STREET FIGHTER 6*\n• O mais novo da série!\n• Gráficos incríveis\n• Modo World Tour\n\n👊 *TEKKEN 8*\n• Lançamento 2024\n• Novos personagens\n• Heat System\n\n💀 *MORTAL KOMBAT 1*\n• Fatalities brutais\n• História épica\n• Kameo Fighters\n\n🔥 Qual você quer jogar primeiro?`);
      
    } else if (messageBody.includes('torneio') || messageBody.includes('competição') || messageBody.includes('campeonato')) {
      msg.reply(`🏆 *TORNEIOS FIGHT ARCADE* 🏆\n\n📅 *CRONOGRAMA SEMANAL:*\n• Terça: Street Fighter (19h)\n• Quinta: Tekken (19h)\n• Sábado: MK1 (15h)\n• Domingo: KOF XV (14h)\n\n💰 *PREMIAÇÃO:*\n• 1º lugar: R$ 100,00\n• 2º lugar: R$ 50,00\n• 3º lugar: R$ 25,00\n\n📝 Inscrições até 30min antes!\nVenha mostrar suas habilidades! 💪`);
      
    } else if (messageBody.includes('aula') || messageBody.includes('ensinar') || messageBody.includes('aprender')) {
      msg.reply(`🎓 *AULAS PARTICULARES* 🎓\n\n👨‍🏫 *NOSSOS INSTRUTORES:*\n• Prof. Carlos - Street Fighter\n• Prof. Ana - Tekken\n• Prof. João - Mortal Kombat\n\n📚 *O QUE VOCÊ APRENDE:*\n• Combos básicos e avançados\n• Estratégias de luta\n• Frame data\n• Psicologia do jogo\n\n⏰ Aulas de 1 hora\n💰 R$ 30,00 por aula\n📞 Agende já sua aula!`);
      
    } else if (messageBody.includes('contato') || messageBody.includes('telefone') || messageBody.includes('whatsapp')) {
      msg.reply(`📞 *NOSSOS CONTATOS* 📞\n\n📱 *WhatsApp:* (11) 99999-9999\n📧 *Email:* contato@fightarcade.com\n📍 *Endereço:* Rua dos Gamers, 123\n🌐 *Instagram:* @fightarcade\n\n🕐 *Atendimento:*\nSeg-Sex: 9h às 18h\nSáb: 9h às 15h\n\n💬 Estamos sempre prontos para ajudar!`);
      
    } else if (messageBody.includes('aniversário') || messageBody.includes('festa') || messageBody.includes('evento')) {
      msg.reply(`🎉 *FESTA DE ANIVERSÁRIO* 🎉\n\n🎂 *PACOTES DISPONÍVEIS:*\n\n🥉 *BRONZE (até 10 pessoas):*\n• 3 horas de jogos\n• Refrigerante à vontade\n• R$ 200,00\n\n🥈 *PRATA (até 15 pessoas):*\n• 4 horas + pizza\n• Torneio exclusivo\n• R$ 350,00\n\n🥇 *OURO (até 20 pessoas):*\n• 5 horas + pizza + bolo\n• Instrutor particular\n• R$ 500,00\n\n🎈 Agende com 1 semana de antecedência!`);
      
    } else if (messageBody.includes('obrigad') || messageBody.includes('valeu') || messageBody.includes('thanks')) {
      msg.reply(`😊 Por nada, ${userName}! Foi um prazer ajudar!\n\n🎮 Esperamos você no Fight Arcade em breve!\n\n⚡ Lembre-se: a diversão nunca para por aqui! 🕹️`);
      
    } else if (messageBody.includes('tchau') || messageBody.includes('bye') || messageBody.includes('até')) {
      msg.reply(`👋 Até logo, ${userName}!\n\n🎮 Volte sempre ao Fight Arcade!\n🏆 A próxima vitória pode ser sua! 💪`);
      
    } else {
      // Resposta inteligente para mensagens não reconhecidas
      const helpMessages = [
        `🤔 Hmm, não entendi muito bem, ${userName}!\n\n💡 Que tal digitar "menu" para ver nossas opções?\n🎮 Ou "horario" para saber quando funcionamos?`,
        `🎮 Opa ${userName}! Parece que você quer saber algo específico!\n\n📝 Digite "menu" para ver tudo que oferecemos\n📞 Ou "contato" para falar diretamente conosco!`,
        `⚡ Ei ${userName}! Não consegui processar sua mensagem!\n\n🎯 Tente: "jogos", "precos", "torneios" ou "aulas"\n🤖 Estou aqui para ajudar! 🎮`
      ];
      
      msg.reply(helpMessages[Math.floor(Math.random() * helpMessages.length)]);
      console.log(`🎮 Fight Arcade - Mensagem não reconhecida de ${userName}: ${msg.body}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no handleFightArcadeMessage:', error.message);
    msg.reply('🤖 Ops! Tive um probleminha técnico. Tente novamente em alguns segundos! 🔧');
  }
}

