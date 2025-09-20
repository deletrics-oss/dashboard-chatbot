// VERSÃO COM CORREÇÃO ANTI-LOOP DE BOTS (19/09/2025)
import fs from 'fs';
import path from 'path';

// --- LÓGICA DE LOGS (Padrão) ---
const logsDir = path.join(process.cwd(), 'conversation_logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function logMessage(user, type, content) {
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const logEntry = `[${timestamp}] ${type}: ${content}\n`;
    const logFile = path.join(logsDir, 'iigd', `${user.replace('@c.us', '')}.txt`);
    const iigdLogsDir = path.join(logsDir, 'iigd');
    if (!fs.existsSync(iigdLogsDir)) fs.mkdirSync(iigdLogsDir, { recursive: true });
    fs.appendFile(logFile, logEntry, (err) => { if (err) console.error('Falha ao escrever no arquivo de log:', err); });
}

function sendMessageAndLog(client, user, message) {
    if (message && message.trim().length > 0) {
        client.sendMessage(user, message);
        logMessage(user, 'Bot', message.replace(/\n/g, ' '));
    }
}
// --- FIM: LÓGICA DE LOGS ---

const userStates = {};

const welcomeMessage = "A paz do Senhor! Sou o Assistente Virtual do Suporte de TI da IIGD. Estou aqui para te ajudar a resolver problemas técnicos de forma rápida.\n\n" +
    "Por favor, escolha uma das opções abaixo:\n\n" +
    "1️⃣ - *Abrir Chamado Técnico* (Computador, Impressora, etc.)\n" +
    "2️⃣ - *Suporte para CFTV* (Câmeras)\n" +
    "3️⃣ - *Solicitar Cadastro de Biometria*\n" +
    "4️⃣ - *Problemas com Telefonia*\n" +
    "5️⃣ - *Falar Diretamente com Operador de TI*";

/**
 * Função principal que lida com as mensagens do suporte IIGD.
 */
export function handleIigdSupportMessage(msg, client) {
    // FILTRO: Ignora todas as mensagens de grupos
    if (msg.from.endsWith('@g.us')) {
        return;
    }

    if (msg.type !== 'chat' || !msg.body || msg.from === 'status@broadcast') { return; }

    const user = msg.from;
    const text = msg.body.trim();
    logMessage(user, 'Cliente', text);

    if (!userStates[user]) {
        userStates[user] = { stage: 'inicio', data: {} };
    }

    if (userStates[user].stage === 'atendimento_humano') {
        if (text.match(/^(menu|início|start|voltar|sair|ajuda)/i)) {
            sendMessageAndLog(client, user, "Assistente virtual reativado! 👋");
            handleUniversalCommands(user, 'menu', client);
        }
        return; 
    }

    const commandHandled = handleUniversalCommands(user, text, client);
    if (commandHandled) { return; }

    // Gerenciador de Estados da Conversa
    switch (userStates[user].stage) {
        case 'aguardando_menu_principal':
            handleMainMenu(user, text, client);
            break;
        
        case 'aguardando_confirmacao_reinicio':
            sendMessageAndLog(client, user, "Ok, vamos prosseguir com a abertura do chamado.\n\nPara começar, por favor, digite seu *nome completo*.");
            userStates[user].stage = 'coletando_nome';
            break;

        case 'coletando_nome':
            userStates[user].data.nome = text;
            sendMessageAndLog(client, user, `Obrigado, ${text}! Agora, por favor, informe o seu *departamento*.`);
            userStates[user].stage = 'coletando_departamento';
            break;

        case 'coletando_departamento':
            userStates[user].data.departamento = text;
            sendMessageAndLog(client, user, "Certo. Agora, *descreva o problema* que você está enfrentando com o máximo de detalhes possível.");
            userStates[user].stage = 'coletando_problema';
            break;

        case 'coletando_problema':
            userStates[user].data.problema = text;
            sendMessageAndLog(client, user, "Entendido. Para agilizar o atendimento, por favor, abra o *AnyDesk* ou *TeamViewer* e informe o *ID/Endereço de acesso*.\n\nSe não souber ou não tiver, apenas digite *'não tenho'*.");
            userStates[user].stage = 'coletando_id_remoto';
            break;
            
        case 'coletando_id_remoto':
            userStates[user].data.id_remoto = text;
            const finalMessage = "Chamado registrado com sucesso! ✅\n\n" +
                `*Nome:* ${userStates[user].data.nome}\n` +
                `*Departamento:* ${userStates[user].data.departamento}\n` +
                `*Problema:* ${userStates[user].data.problema}\n` +
                `*ID de Acesso Remoto:* ${userStates[user].data.id_remoto}\n\n` +
                "Nossos técnicos já foram notificados e irão até você assim que possível.\n\n" +
                "Digite *menu* para outras opções.";
            sendMessageAndLog(client, user, finalMessage);
            userStates[user].stage = 'aguardando_menu_principal';
            break;
        
        default:
            // CORREÇÃO: Se o bot está no estado inicial e não entende o comando,
            // ele ficará em silêncio para evitar loops com outros bots.
            // Ele só enviará uma mensagem de erro se a conversa já tiver começado.
            if (userStates[user].stage !== 'inicio' && userStates[user].stage !== 'aguardando_menu_principal') {
                sendMessageAndLog(client, user, "Não entendi sua mensagem. 🤔 Por favor, siga as instruções ou digite *menu* para recomeçar.");
            }
            // Se a conversa ainda não começou (stage 'inicio'), o bot não faz nada.
            break;
    }
}


function handleUniversalCommands(user, text, client) {
    if (text.match(/^(oi|olá|ola|paz|bom dia|boa tarde|boa noite|menu|início|start|voltar|sair|ajuda)/i)) {
        userStates[user] = { stage: 'aguardando_menu_principal', data: {} };
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
            message = "Ok, vamos abrir um chamado.\n\n*Mas antes, uma dica importante:* Reiniciar o computador resolve a maioria dos problemas de lentidão e travamentos. Você já tentou reiniciar?\n\nSe já reiniciou e não resolveu, *apenas responda qualquer coisa para continuar* a abertura do chamado.";
            userStates[user].stage = 'aguardando_confirmacao_reinicio';
            break;
        case "2":
            message = "Entendido, sua solicitação de suporte para *CFTV (Câmeras)* foi enviada.\n\nUm especialista da área entrará em contato por aqui em breve. O assistente virtual será pausado. Para reativá-lo, digite *menu*.";
            userStates[user].stage = 'atendimento_humano';
            break;
        case "3":
            message = "Para solicitar o *Cadastro de Biometria*, é necessário preencher o formulário de autorização e entregá-lo assinado ao seu gestor.\n\nO formulário está disponível na Intranet ou pode ser solicitado no ramal do RH. Após a aprovação, o TI irá até você para realizar o cadastro.\n\nDigite *menu* se precisar de mais alguma ajuda.";
            userStates[user].stage = 'aguardando_menu_principal';
            break;
        case "4":
            message = "Para problemas relacionados a *telefones, ramais ou linhas telefônicas*, por favor, ligue diretamente para o setor de Telefonia.\n\n📞 O número é: *2126-6873*\n\nDigite *menu* se precisar de mais alguma ajuda.";
            userStates[user].stage = 'aguardando_menu_principal';
            break;
        case "5":
            message = "Entendido. Nossos operadores de TI já foram notificados e logo entrarão em contato por aqui.\n\nO assistente virtual será pausado para não atrapalhar a conversa. Para reativá-lo a qualquer momento, basta digitar *menu*. 🙂";
            userStates[user].stage = 'atendimento_humano';
            break;
        default:
            sendMessageAndLog(client, user, "Opção inválida. 🤔 Por favor, escolha um número de 1 a 5.");
            setTimeout(() => { sendMessageAndLog(client, user, welcomeMessage); }, 700);
            return;
    }
    sendMessageAndLog(client, user, message);
}
