// VERSÃO DEFINITIVA E COMPLETA - IGNORA GRUPOS (18/09/2025)
import fs from 'fs';
import path from 'path';

// --- LÓGICA DE LOGS ---
const logsDir = path.join(process.cwd(), 'conversation_logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function logMessage(user, type, content) {
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const logEntry = `[${timestamp}] ${type}: ${content}\n`;
    const logFile = path.join(logsDir, `${user.replace('@c.us', '')}.txt`);
    fs.appendFile(logFile, logEntry, (err) => { 
        if (err) console.error('Falha ao escrever no arquivo de log:', err); 
    });
}

function sendMessageAndLog(client, user, message) {
    if (message && message.trim().length > 0) {
        client.sendMessage(user, message);
        logMessage(user, 'Bot', message.replace(/\n/g, ' '));
    }
}
// --- FIM: LÓGICA DE LOGS ---

const userStates = {};

const welcomeMessage = "Olá! 👋 Sou seu assistente virtual do Fight Arcade e vou te ajudar a encontrar tudo o que precisa.\n\n" +
    "Para começarmos, me diga o que você gostaria de fazer:\n\n" +
    "1️⃣ - Ver modelos e preços\n" +
    "2️⃣ - Ver opções de estampas\n" +
    "3️⃣ - Suporte Técnico\n" +
    "4️⃣ - Finalizar compra\n" +
    "5️⃣ - Falar com um atendente";

const supportMenuMessage = "Entendo que precisa de ajuda. Selecione o problema que você está enfrentando (digite apenas o número):\n\n" +
    "1 - Comando não funciona\n" + "2 - Comando andando sozinho\n" + "3 - Botões não funcionam\n" +
    "4 - Fliperama não liga/inicializa\n" + "5 - Alterar configurações dos controles\n" +
    "6 - Como utilizar o fliperama (guia rápido)\n" + "7 - Como adicionar mais jogos\n" +
    "8 - Como instalar um controle adicional\n" + "9 - Como regravar o sistema (em caso de erro)\n" +
    "10 - Suporte para Placas (Pico, Sanwa, etc.)\n\n" +
    "0 - Voltar ao menu principal";


export function handleFightArcadeMessage(msg, client) {
    // FILTRO: Ignora todas as mensagens de grupos
    if (msg.from.endsWith('@g.us')) {
        return;
    }

    if (msg.type !== 'chat' || !msg.body || msg.from === 'status@broadcast') {
        return;
    }

    const user = msg.from;
    const text = msg.body.trim();
    logMessage(user, 'Cliente', text);

    if (!userStates[user]) {
        userStates[user] = { stage: 'inicio' };
    }

    if (userStates[user].stage === 'atendimento_humano') {
        if (text.match(/^(menu|início|start|voltar|sair)/i)) {
            sendMessageAndLog(client, user, "Assistente virtual reativado! 👋");
            handleUniversalCommands(user, 'menu', client);
        }
        return; 
    }

    const commandHandled = handleUniversalCommands(user, text, client);
    if (commandHandled) {
        return;
    }

    switch (userStates[user].stage) {
        case 'aguardando_menu_principal':
            handleMainMenu(user, text, client);
            break;
        case 'aguardando_tipo_produto':
            handleProductType(user, text, client);
            break;
        case 'aguardando_jogadores':
            handlePlayers(user, text, client);
            break;
        case 'aguardando_material':
            handleMaterial(user, text, client);
            break;
        case 'aguardando_suporte':
            handleSupportResponse(user, text, client);
            break;
        case 'aguardando_finalizar_compra':
            handlePurchaseResponse(user, text, client);
            break;
        default:
            sendMessageAndLog(client, user, "Não entendi sua mensagem. 🤔\n\nVou te mostrar o menu principal com tudo que posso fazer para te ajudar:");
            setTimeout(() => {
                userStates[user] = { stage: 'aguardando_menu_principal' };
                sendMessageAndLog(client, user, welcomeMessage);
            }, 700);
            break;
    }
}


function handleUniversalCommands(user, text, client) {
    if (text.match(/^(oi|olá|ola|eai|tudo bem|menu|início|start|voltar|sair)/i)) {
        userStates[user] = { stage: 'aguardando_menu_principal' };
        sendMessageAndLog(client, user, welcomeMessage);
        return true;
    }
    
    const isAtMainMenu = !userStates[user].stage || userStates[user].stage === 'aguardando_menu_principal' || userStates[user].stage === 'inicio';
    if (isAtMainMenu && text.match(/^[1-5]$/)) {
        handleMainMenu(user, text, client);
        return true;
    }

    return false;
}


function handleMainMenu(user, text, client) {
    let message = "";
    switch (text) {
        case "1":
            message = "Legal! Para começar, me diga o que você procura:\n\n1️⃣ - Fliperama Completo (com jogos)\n2️⃣ - Apenas Controle USB (para PC/Fightcade, sem jogos)";
            userStates[user].stage = 'aguardando_tipo_produto';
            break;
        case "2":
            message = "A personalização é a parte mais divertida! Você pode escolher entre dezenas de estampas para deixar o fliperama com a sua cara.\n\nVeja todas as opções em nosso catálogo online aqui:\n👉 https://acesse.one/fightarcadeestampa\n\nDepois de escolher, digite 'menu' para voltar e finalizar sua compra ou ver outras opções.";
            userStates[user].stage = 'aguardando_menu_principal';
            break;
        case "3":
            message = supportMenuMessage;
            userStates[user].stage = 'aguardando_suporte';
            break;
        case "4":
            message = "Que ótimo! Para finalizar sua compra, você tem algumas opções. Escolha a que for melhor para você:\n\n1️⃣ - Comprar Online (Mercado Livre / Shopee)\n2️⃣ - Finalizar com Atendente (Entrega Expressa)";
            userStates[user].stage = 'aguardando_finalizar_compra';
            break;
        case "5":
            message = "Tudo bem! Nossos especialistas já foram notificados e logo irão te responder.\n\nO assistente virtual será pausado para não atrapalhar a conversa. Para reativá-lo a qualquer momento, basta digitar *menu*. 🙂";
            userStates[user].stage = 'atendimento_humano';
            break;
        default:
            sendMessageAndLog(client, user, "Opção inválida. 🤔 Por favor, escolha uma das opções abaixo:");
            setTimeout(() => {
                sendMessageAndLog(client, user, welcomeMessage);
            }, 700);
            return;
    }
    sendMessageAndLog(client, user, message);
}


function handleSupportResponse(user, text, client) {
    let response = "";
    const helpFollowUp = "\n\nEspero ter ajudado! Digite *3* para ver outras opções de suporte ou *menu* para voltar ao início.";
    if (text === '0') { userStates[user].stage = 'aguardando_menu_principal'; sendMessageAndLog(client, user, welcomeMessage); return; }
    switch (text) {
        case "1": response = "Ok, vamos resolver o *comando que não funciona*! Geralmente é algo simples.\n\n" + "1. *Verifique os fios:* Por conta do transporte, algum fio pode ter se soltado. Remova os 4 ou 6 parafusos da tampa traseira para verificar.\n" + "2. *Cheque a placa:* Com o fliperama ligado, veja se há algum fio solto. A placa principal geralmente tem um LED aceso. Se o LED estiver desligado, tente reencaixar o fio de energia dela com cuidado.\n" + "3. *Teste o Hub USB (para 2 players):* Se um comando funciona e o outro não, pode ser o hub. Desligue o hub e conecte o fio do controle que não funciona diretamente na placa principal do jogo."; break;
        case "2": response = "Certo, vamos arrumar o *comando andando sozinho*. Isso pode ter duas causas, dependendo do seu tipo de comando:\n\n" + "*Se for Comando MECÂNICO:*\nA `micro-switch` (pecinha com haste de metal) pode ter se desalinhado. Abra a tampa e veja se a haste está encostando demais no comando. Com cuidado, entorte um pouco a haste para fora para que ela só encoste quando você mexer o direcional.\n\n" + "*Se for Comando ÓPTICO:*\nO problema pode ser interferência de luz nos sensores.\n" + "1. *Isole a luz:* Use fita isolante para vedar qualquer fresta ou feixe de luz dentro da caixa.\n" + "2. *Ajuste a sensibilidade:* Na placa do sensor, procure por um componente azul chamado `trimpot`. Gire o parafuso dourado dele bem devagar para encontrar o melhor ajuste."; break;
        case "3": response = "Ok, se os *botões não funcionam*, geralmente é um fio solto. Vamos verificar:\n\n" + "1. *Abra com cuidado:* Remova os parafusos da tampa. *ATENÇÃO:* Abra devagar para não puxar nenhum fio.\n" + "2. *Inspecione os fios:* Verifique se o fio do botão se soltou do conector do próprio botão ou da placa 'zero delay'.\n" + "3. *Reencaixe:* Se encontrar um fio solto, apenas reencaixe-o firmemente."; break;
        case "4": response = "Ok, se o *fliperama não está ligando*, vamos checar a energia. Siga estes passos:\n\n" + "1. *Teste o Básico:* Verifique a tomada e se a fonte de energia está bem conectada. Pressione o botão de ligar algumas vezes.\n" + "2. *Teste com outra fonte:* Se suspeita da fonte, uma de roteador (12V / 1A) pode funcionar para um teste rápido.\n" + "3. *Solicite uma nova:* Se confirmar que a fonte é o problema, digite *menu* e fale com um atendente para solicitar uma nova."; break;
        case "5": response = "Para *alterar a configuração dos botões*, você deve fazer isso dentro de cada jogo. Preparamos um guia que mostra como fazer:\n👉 https://sl1nk.com/alterarbotoesdentrodojogo"; break;
        case "6": response = "Claro! Para aprender a *utilizar o fliperama*, preparamos um manual completo para você. Escolha o formato que preferir:\n\n" + "📖 Manual em Texto:\n👉 https://l1nq.com/manualfightarcade\n\n" + "📹 Manual em Vídeo:\n👉 www.fightarcade.com.br/videomanual"; break;
        case "7": response = "Sim, é possível *adicionar ou remover jogos*. Siga nosso tutorial com atenção.\n👉 https://sl1nk.com/adicionarouremoverjogos\n\n*Atenção:* Se feito de forma incorreta, pode danificar o sistema."; break;
        case "8": response = "Para *instalar e configurar um controle adicional*, siga nosso guia passo a passo.\n👉 https://sl1nk.com/configurarcontrolesnovos"; break;
        case "9": response = "Se o sistema foi danificado, é possível *reinstalá-lo* com nosso guia de recuperação.\n👉 https://sl1nk.com/recuperarosistema"; break;
        case "10": response = "Claro! Todas as informações, guias e diagramas para nossas placas estão centralizados em nosso site principal. Por favor, acesse:\n\n" + "👉 www.fightarcade.com.br"; break;
        default: response = "Opção de suporte inválida. Por favor, escolha um número da lista ou digite 0 para voltar."; break;
    }
    if (!response.startsWith("Opção de suporte inválida")) { response += helpFollowUp; }
    sendMessageAndLog(client, user, response);
    userStates[user].stage = 'aguardando_menu_principal';
}


function handleProductType(user, text, client) {
    const question = "Para começar, me diga o que você procura:\n\n1️⃣ - Fliperama Completo (com jogos)\n2️⃣ - Apenas Controle USB (para PC/Fightcade, sem jogos)";
    if (text === '1' || text === '2') {
        userStates[user].tipo_produto = text;
        sendMessageAndLog(client, user, "Certo! E você precisa para quantos jogadores?\n\n1️⃣ - Para 1 Jogador\n2️⃣ - Para 2 Jogadores");
        userStates[user].stage = 'aguardando_jogadores';
    } else { sendMessageAndLog(client, user, `Opção inválida. Por favor, digite 1 ou 2.\n\n${question}`); }
}

function handlePlayers(user, text, client) {
    const question = "Você precisa para quantos jogadores?\n\n1️⃣ - Para 1 Jogador\n2️⃣ - Para 2 Jogadores";
     if (text === '1' || text === '2') {
        userStates[user].jogadores = text;
        if (userStates[user].tipo_produto === '1') {
            sendMessageAndLog(client, user, "Ótimo! E qual material você prefere?\n\n1️⃣ - MDF (Clássico)\n2️⃣ - Metal (Ultra Resistente)");
            userStates[user].stage = 'aguardando_material';
        } else { handleModelResponse(user, client); }
    } else { sendMessageAndLog(client, user, `Opção inválida. Por favor, digite 1 ou 2.\n\n${question}`); }
}

function handleMaterial(user, text, client) {
    const question = "Qual material você prefere?\n\n1️⃣ - MDF (Clássico)\n2️⃣ - Metal (Ultra Resistente)";
    if (text === '1' || text === '2') {
        userStates[user].material = text;
        handleModelResponse(user, client);
    } else { sendMessageAndLog(client, user, `Opção inválida. Por favor, digite 1 ou 2.\n\n${question}`); }
}

function handleModelResponse(user, client) {
    const { tipo_produto, jogadores, material } = userStates[user];
    let response = "";
    if (tipo_produto === '1') {
        if (jogadores === '1' && material === '1') response = "Perfeito! Para o Fliperama de 1 Jogador em *MDF*:\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 550\n🔗 www.fightarcade.com.br/mdf\n\nTemos também a *versão em Metal*, mais resistente, a partir de R$ 599! Veja em:\n🔗 www.fightarcade.com.br/metal";
        else if (jogadores === '1' && material === '2') response = "Excelente! Para o Fliperama de 1 Jogador em *Metal*:\n🕹️ Mecânico: R$ 599\n✨ Óptico: R$ 650\n🔗 www.fightarcade.com.br/metal";
        else if (jogadores === '2' && material === '1') response = "Show! Para o Fliperama de 2 Jogadores em *MDF*:\n🕹️ Mecânico: R$ 599\n✨ Óptico: R$ 699\n🔗 www.fightarcade.com.br/mdf\n\nTemos também a *versão em Metal*, mais resistente, a partir de R$ 699! Veja em:\n🔗 www.fightarcade.com.br/metal";
        else if (jogadores === '2' && material === '2') response = "Ótima pedida! Para o Fliperama de 2 Jogadores em *Metal*:\n🕹️ Mecânico: R$ 699\n✨ Óptico: R$ 799\n🔗 www.fightarcade.com.br/metal";
    } else if (tipo_produto === '2') {
        if (jogadores === '1') response = "Controle USB 1 Jogador:\n\n*MDF*:\n🕹️ Mecânico: R$ 299\n✨ Óptico: R$ 350\n🚀 Óptico Pico: R$ 450\n\n*Metal*:\n🕹️ Mecânico: R$ 399\n✨ Óptico: R$ 450";
        if (jogadores === '2') response = "Controle USB 2 Jogadores:\n\n*MDF*:\n🕹️ Mecânico: R$ 499\n✨ Óptico: R$ 599\n\n*Metal*:\n🕹️ Mecânico: R$ 650\n✨ Óptico: R$ 750";
    }
    sendMessageAndLog(client, user, response);
    setTimeout(() => {
        sendMessageAndLog(client, user, "Qual a diferença entre os comandos? 🤔\nO comando *mecânico* usa micro-switches (peças físicas) para registrar os movimentos, como nos arcades clássicos. Já o comando *óptico* não tem contato físico, usando sensores de luz, o que garante precisão total e durabilidade muito maior!");
        setTimeout(() => {
             sendMessageAndLog(client, user, "O que você gostaria de fazer agora?\n\n4️⃣ - Finalizar compra\n5️⃣ - Falar com um atendente\n\nOu digite *menu* para ver todas as opções.");
        }, 2000);
    }, 1500);
    userStates[user].stage = 'aguardando_menu_principal';
}

function handlePurchaseResponse(user, text, client) {
    let message = "";
    if (text === '1') {
        message = "Perfeito! Você pode comprar com toda a segurança em nossas lojas oficiais:\n\n" + "🛒 **Mercado Livre**\n" + "✨ Ver todos os produtos:\nhttps://lista.mercadolivre.com.br/pagina/fightarcade\n" + "🕹️ Controle Duplo USB:\nhttps://produto.mercadolivre.com.br/MLB-4676430172-controle-duplo-usb-zero-delay-ultra-veloz-p-fliperama-games-_JM\n\n" + "🛍️ **Shopee**\n" + "✨ Ver todos os produtos:\nhttps://shopee.com.br/laradecor\n" + "🚀 Fliperama de Metal (Completo):\nhttps://shopee.com.br/Super-Fliperama-retro-com-64000-145000-jogos-arcade-x-KOF-online-community-i.308570109.18599789572\n" + "🎮 Controle Arcade (1 Player):\nhttps://shopee.com.br/Controle-Arcade-Fliperama-Pc-play3-play4-rasp-Kof-i.428680831.19998266388\n\n" + "Digite *menu* se precisar de algo mais.";
        userStates[user].stage = 'aguardando_menu_principal';
    } else if (text === '2') {
        message = "Ótima escolha! Comprando diretamente conosco, temos uma vantagem especial:\n\n" + "✅ *Produção Expressa:* Seu fliperama fica pronto em 3-4 horas!\n" + "📹 *Vídeo Exclusivo:* Enviamos um vídeo do seu produto pronto.\n" + "🛵 *Entrega Rápida:* Podemos enviar no mesmo dia por motoboy.\n\n" + "Nossos especialistas já foram notificados para finalizar sua compra. Se preferir, pode nos chamar diretamente no WhatsApp: *11 98812-1976*\n\n" + "O assistente virtual será pausado para não atrapalhar. Para reativá-lo a qualquer momento, basta digitar *menu*. 🙂";
        userStates[user].stage = 'atendimento_humano';
    } else {
        message = "Opção inválida. Por favor, escolha 1 ou 2.";
    }
    sendMessageAndLog(client, user, message);
}
