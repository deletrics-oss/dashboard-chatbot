// Objeto para armazenar o estágio da conversa de cada usuário
const userStates = {};

/**
 * Lida com as mensagens recebidas para o fluxo do Fight Arcade.
 * @param {Message} msg O objeto da mensagem recebido.
 * @param {Client} client O cliente do WhatsApp.
 */
export function handleFightArcadeMessage(msg, client) {
    const user = msg.from;
    const text = msg.body.trim();

    // Se não houver um estado para o usuário, inicializa.
    if (!userStates[user]) {
        userStates[user] = { stage: 'inicio' };
    }

    // === INÍCIO: Saudação (funciona a qualquer momento) ===
    if (text.match(/^(oi|olá|ola|bom dia|boa tarde|boa noite|menu|início|start)/i)) {
        userStates[user] = { stage: 'inicio' }; // Reseta o estado para o menu principal
        client.sendMessage(
            user,
            "Olá! 👋 Vi que você veio do Facebook e tem interesse em nossos fliperamas. Que legal! Sou seu assistente virtual e vou te ajudar a encontrar tudo o que precisa.\n\n" +
            "Para começarmos, me diga o que você gostaria de fazer:\n\n" +
            "1️⃣ - Ver modelos e preços\n" +
            "2️⃣ - Ver opções de estampas\n" +
            "3️⃣ - Suporte Técnico\n" +
            "4️⃣ - Finalizar compra\n" +
            "5️⃣ - Falar com um atendente"
        );
        userStates[user].stage = 'aguardando_menu_principal';
        return;
    }

    // === Lógica baseada no estágio da conversa ===
    switch (userStates[user].stage) {

        case 'aguardando_menu_principal':
            handleMainMenu(user, text, client);
            break;

        case 'aguardando_tipo_produto':
            userStates[user].tipo_produto = text;
            if (text === '1' || text === '2') {
                client.sendMessage(user, `Entendido! Você precisa para quantos jogadores?\n\n1️⃣ - 1 Jogador\n2️⃣ - 2 Jogadores`);
                userStates[user].stage = 'aguardando_jogadores';
            } else {
                client.sendMessage(user, "Opção inválida. Por favor, digite 1 para Fliperama Completo ou 2 para Controle USB.");
            }
            break;

        case 'aguardando_jogadores':
            userStates[user].jogadores = text;
            if (text === '1' || text === '2') {
                client.sendMessage(user, `Ótimo! E qual material você prefere para o gabinete?\n\n1️⃣ - MDF (Clássico)\n2️⃣ - Metal (Ultra Resistente)`);
                userStates[user].stage = 'aguardando_material';
            } else {
                client.sendMessage(user, "Opção inválida. Por favor, digite 1 para 1 jogador ou 2 para 2 jogadores.");
            }
            break;

        case 'aguardando_material':
            userStates[user].material = text;
            if (text === '1' || text === '2') {
                handleModelResponse(user, client);
            } else {
                client.sendMessage(user, "Opção inválida. Por favor, digite 1 para MDF ou 2 para Metal.");
            }
            break;

        case 'aguardando_suporte':
            handleSupportResponse(user, text, client);
            break;

        case 'aguardando_finalizar_compra':
            handlePurchaseResponse(user, text, client);
            break;

        default:
            client.sendMessage(user, "Desculpe, não entendi. Digite *'menu'* para ver as opções novamente.");
            userStates[user] = { stage: 'inicio' };
            break;
    }
}

/**
 * Processa a escolha do menu principal.
 */
function handleMainMenu(user, text, client) {
    switch (text) {
        case "1":
            client.sendMessage(user, "Legal! Para começar, me diga o que você procura:\n\n1️⃣ - Fliperama Completo (com jogos)\n2️⃣ - Apenas Controle USB (para PC/Fightcade, sem jogos)");
            userStates[user].stage = 'aguardando_tipo_produto';
            break;
        case "2":
            client.sendMessage(
                user,
                "A personalização é a parte mais divertida! Você pode escolher entre dezenas de estampas para deixar o fliperama com a sua cara.\n\n" +
                "Veja todas as opções em nosso catálogo online aqui:\n👉 https://acesse.one/fightarcadeestampa\n\n" +
                "Depois de escolher, digite *'menu'* para voltar e finalizar sua compra ou ver outras opções."
            );
            userStates[user] = { stage: 'inicio' }; // Reseta
            break;
        case "3":
            client.sendMessage(
                user,
                "Entendo que precisa de ajuda. Selecione o problema que você está enfrentando na lista abaixo (digite apenas o número):\n\n" +
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
            userStates[user].stage = 'aguardando_suporte';
            break;
        case "4":
            client.sendMessage(user, "Que ótimo! Para finalizar sua compra, você tem algumas opções. Escolha a que for melhor para você:\n\n1️⃣ - Comprar Online (Mercado Livre / Shopee)\n2️⃣ - Finalizar com Atendente (Entrega Expressa)");
            userStates[user].stage = 'aguardando_finalizar_compra';
            break;
        case "5":
            client.sendMessage(user, "Tudo bem! Já estou transferindo sua conversa para um de nossos especialistas. Por favor, aguarde um momento. 🙂");
            delete userStates[user]; // Finaliza o atendimento do bot
            break;
        default:
            client.sendMessage(user, "Opção inválida. Por favor, digite um número de 1 a 5.");
            break;
    }
}

/**
 * Constrói e envia a resposta final para a consulta de modelos.
 */
function handleModelResponse(user, client) {
    const { tipo_produto, jogadores, material } = userStates[user];
    let response = "";

    if (tipo_produto === '1') { // Fliperama Completo
        if (jogadores === '1' && material === '1') response = "Perfeito! Para o *Fliperama de 1 Jogador em MDF*:\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 550\n🔗 www.fightarcade.com.br/mdf";
        if (jogadores === '1' && material === '2') response = "Excelente! Para o *Fliperama de 1 Jogador em Metal*:\n🕹️ Mecânico: R$ 599\n✨ Óptico: R$ 650\n🔗 www.fightarcade.com.br/metal";
        if (jogadores === '2' && material === '1') response = "Show! Para o *Fliperama de 2 Jogadores em MDF*:\n🕹️ Mecânico: R$ 599\n✨ Óptico: R$ 699\n🔗 www.fightarcade.com.br/mdf";
        if (jogadores === '2' && material === '2') response = "Ótima pedida! Para o *Fliperama de 2 Jogadores em Metal*:\n🕹️ Mecânico: R$ 699\n✨ Óptico: R$ 799\n🔗 www.fightarcade.com.br/metal";
    } else if (tipo_produto === '2') { // Controle USB
        if (jogadores === '1') response = "*Controle USB 1 Jogador*:\n\n*MDF*:\n🕹️ Mecânico: R$ 299\n✨ Óptico: R$ 350\n🚀 Óptico Pico: R$ 450\n\n*Metal*:\n🕹️ Mecânico: R$ 399\n✨ Óptico: R$ 450";
        if (jogadores === '2') response = "*Controle USB 2 Jogadores*:\n\n*MDF*:\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 599\n\n*Metal*:\n🕹️ Mecânico: R$ 650\n✨ Óptico: R$ 750";
    }

    if (response) {
        client.sendMessage(user, response);
        setTimeout(() => {
            client.sendMessage(user, "*Qual a diferença entre os comandos?* 🤔\nO *comando mecânico* usa micro-switches (peças físicas) para registrar os movimentos, como nos arcades clássicos. Já o *comando óptico* não tem contato físico, usando sensores de luz, o que garante precisão total e durabilidade muito maior!\n\nDigite *'menu'* para voltar ao início e fazer uma nova consulta.");
        }, 1500);
    } else {
        client.sendMessage(user, "Desculpe, não encontrei essa combinação. Vamos tentar de novo. Digite *'menu'*.");
    }
    userStates[user] = { stage: 'inicio' }; // Reseta
}

/**
 * Envia a resposta de suporte técnico correspondente.
 */
function handleSupportResponse(user, text, client) {
    let response = "";
    switch (text) {
        case "1": response = "Ok, vamos resolver isso! Geralmente é algo simples...\n1. *Verifique os fios:* Remova os parafusos da tampa e veja se algum fio se soltou da placa.\n2. *Cheque o LED:* A placa principal tem um LED, veja se está aceso.\n3. *Teste o Hub USB (para 2p):* Se um controle funciona e o outro não, tente ligar o controle com defeito direto na placa principal.\n\nSe não resolver, digite *menu* e escolha falar com um atendente."; break;
        case "2": response = "Certo, isso depende do tipo de comando.\n\n*MECÂNICO:* A micro-switch pode estar desalinhada. Abra o fliperama e entorte a haste de metal dela um pouco para fora.\n\n*ÓPTICO:* Pode ser interferência de luz. Vede qualquer fresta com fita isolante. Se não resolver, ajuste a sensibilidade no 'trimpot' azul da placa do sensor."; break;
        case "3": response = "Isso geralmente é um fio solto. Abra a tampa *com cuidado* para não puxar nada. Verifique se o fio do botão se soltou do próprio botão ou da placa 'zero delay' e reencaixe."; break;
        case "4":
        case "6": response = "Se o fliperama não liga, vamos checar a energia.\n1. *Teste o básico:* Veja se a tomada e o cabo estão ok. Pressione o botão de ligar algumas vezes.\n2. *Teste com outra fonte:* Uma fonte de roteador (12V / 1A) pode servir para um teste rápido.\n3. *Peça uma nova:* Se for a fonte, digite *menu* e fale com um atendente para solicitar uma nova."; break;
        case "5": response = "Vamos testar o HDMI.\n1. *Troque o cabo:* Use outro cabo HDMI.\n2. *Troque a porta da TV:* Conecte em outra entrada HDMI da sua TV.\n3. *Teste em outra TV:* Se possível, teste o fliperama em outra TV.\n\nSe nada disso funcionar, fale com nosso suporte."; break;
        case "7": response = "Para alterar a configuração dos botões, você deve fazer isso *dentro de cada jogo*. Preparamos um guia que mostra como fazer:\n👉 https://sl1nk.com/alterarbotoesdentrodojogo"; break;
        case "8": response = "Claro! Preparamos um manual completo com tudo o que você precisa saber.\n👉 https://l1nq.com/manualfightarcade"; break;
        case "9": response = "Sim, é possível adicionar ou remover jogos. Siga nosso tutorial com atenção.\n👉 https://sl1nk.com/adicionarouremoverjogos\n\n*Atenção:* Se feito de forma incorreta, pode danificar o sistema."; break;
        case "10": response = "Para instalar e configurar um controle adicional, siga nosso guia passo a passo.\n👉 https://sl1nk.com/configurarcontrolesnovos"; break;
        case "11": response = "Se o sistema foi danificado, é possível reinstalá-lo com nosso guia de recuperação.\n👉 https://sl1nk.com/recuperarosistema"; break;
        case "0": response = "Ok, voltando ao menu principal."; userStates[user].stage = 'inicio'; text = 'menu'; handleFightArcadeMessage({ from: user, body: text }, client); return;
        default: response = "Opção de suporte inválida. Por favor, escolha um número da lista."; break;
    }
    client.sendMessage(user, response);
    if(text !== '0') {
        setTimeout(() => {
            client.sendMessage(user, "Se o problema não for resolvido, digite *'menu'* e selecione a opção 5 para falar com um atendente.");
        }, 2000);
        userStates[user] = { stage: 'inicio' }; // Reseta
    }
}

/**
 * Processa a escolha de finalização de compra.
 */
function handlePurchaseResponse(user, text, client) {
    if (text === '1') {
        client.sendMessage(user, "Perfeito! Você pode comprar com toda a segurança em nossas lojas oficiais:\n\n🛒 *Mercado Livre:* `[SEU LINK DO MERCADO LIVRE]`\n🛍️ *Shopee:* `[SEU LINK DA SHOPEE]`\n🌐 *Nosso Site:* https://www.fightarcade.com.br/mdf/");
    } else if (text === '2') {
        client.sendMessage(user, "Ótima escolha! Comprando diretamente conosco, temos uma vantagem especial:\n\n✅ *Produção Expressa:* Seu fliperama fica pronto em 3-4 horas!\n📹 *Vídeo Exclusivo:* Enviamos um vídeo do seu produto pronto.\n🛵 *Entrega Rápida:* Podemos enviar no mesmo dia por motoboy (Uber Flash ou Lalamove).\n\nPara continuar, vou te transferir para um de nossos vendedores. Por favor, aguarde. 🙂");
        delete userStates[user];
    } else {
        client.sendMessage(user, "Opção inválida. Por favor, escolha 1 ou 2.");
    }
    if (text === '1') {
      userStates[user] = { stage: 'inicio' }; // Reseta se for compra online
    }
}
