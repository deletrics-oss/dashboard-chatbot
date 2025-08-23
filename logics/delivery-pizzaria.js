// logics/delivery-pizzaria.js

// Esta função será chamada pelo server.js e receberá a instância do cliente (bot), o socket.io e as sessões
const attachLogic = (client, io, sessions) => {
    
    // Ouve por novas mensagens para este dispositivo específico
    client.on('message', async (msg) => {
        // Ignora mensagens que não são de utilizadores individuais
        if (!msg.from.endsWith('@c.us')) return;

        const contact = await msg.getContact();
        const contactName = contact.pushname || msg.from.replace('@c.us', '');
        
        // Emite a mensagem para o dashboard para que possa ser vista em tempo real
        io.emit('new_message', {
            clientId: client.options.clientId,
            from: contactName,
            body: msg.body,
            timestamp: new Date().toLocaleTimeString(),
            type: 'user'
        });

        const userStates = sessions.userStates;
        const chat = await msg.getChat();
        const user = msg.from;
        const messageBody = msg.body.trim().toLowerCase();

        // Inicializa o estado da conversa para um novo utilizador
        if (!userStates[user]) {
            userStates[user] = { stage: 'inicio', pedido: {} };
        }

        // --- INÍCIO DA LÓGICA DO CHATBOT DE DELIVERY ---

        // Saudação inicial
        if (userStates[user].stage === 'inicio' && messageBody.match(/^(oi|olá|ola|menu|começar)/i)) {
            userStates[user] = { stage: 'inicio', pedido: {} }; // Reinicia o pedido
            await chat.sendStateTyping();
            await client.sendMessage(user, `Olá, ${contactName.split(" ")[0]}! 👋 Bem-vindo(a) à Pizzaria Rápida!\n\nEstou aqui para anotar o seu pedido.\n\nPara começar, por favor, escolha uma das opções do nosso menu:\n\n*1. 🍕 Ver Sabores*\n*2. 📋 Ver o meu pedido*\n*3. 🙋 Falar com um atendente*`);
            userStates[user].stage = 'aguardando_menu';
            return;
        }

        // Lógica baseada nos estágios da conversa
        switch (userStates[user].stage) {
            case 'aguardando_menu':
                if (messageBody === '1') {
                    await client.sendMessage(user, "Ótimo! Os nossos sabores são:\n\n*1. Calabresa*\n*2. Mozzarella*\n*3. Frango com Catupiry*\n*4. Portuguesa*\n\nQual sabor você gostaria de pedir?");
                    userStates[user].stage = 'escolhendo_sabor';
                } else if (messageBody === '2') {
                    // Lógica para ver o pedido (ainda não implementada neste exemplo)
                    await client.sendMessage(user, "Você ainda não fez um pedido. Digite 'menu' para começar.");
                } else if (messageBody === '3') {
                    await client.sendMessage(user, "A transferir a sua conversa para um dos nossos atendentes. Por favor, aguarde um momento.");
                    delete userStates[user]; // Finaliza o atendimento do bot
                } else {
                    await client.sendMessage(user, "Opção inválida. Por favor, escolha uma das opções do menu.");
                }
                break;

            case 'escolhendo_sabor':
                const sabores = { '1': 'Calabresa', '2': 'Mozzarella', '3': 'Frango com Catupiry', '4': 'Portuguesa' };
                if (sabores[messageBody]) {
                    userStates[user].pedido.sabor = sabores[messageBody];
                    await client.sendMessage(user, `Perfeito, pizza de ${sabores[messageBody]}! E qual o tamanho?\n\n*1. Média (6 fatias)*\n*2. Grande (8 fatias)*\n*3. Família (12 fatias)*`);
                    userStates[user].stage = 'escolhendo_tamanho';
                } else {
                    await client.sendMessage(user, "Sabor inválido. Por favor, digite o número do sabor que deseja.");
                }
                break;

            case 'escolhendo_tamanho':
                const tamanhos = { '1': 'Média', '2': 'Grande', '3': 'Família' };
                if (tamanhos[messageBody]) {
                    userStates[user].pedido.tamanho = tamanhos[messageBody];
                    await client.sendMessage(user, `Ótimo, tamanho ${tamanhos[messageBody]}. Gostaria de adicionar alguma bebida?\n\n*1. Coca-Cola 2L*\n*2. Guaraná 2L*\n*3. Água sem gás*\n*4. Não, obrigado*`);
                    userStates[user].stage = 'escolhendo_bebida';
                } else {
                    await client.sendMessage(user, "Tamanho inválido. Por favor, digite o número do tamanho.");
                }
                break;

            case 'escolhendo_bebida':
                const bebidas = { '1': 'Coca-Cola 2L', '2': 'Guaraná 2L', '3': 'Água sem gás' };
                if (bebidas[messageBody]) {
                    userStates[user].pedido.bebida = bebidas[messageBody];
                } else {
                    userStates[user].pedido.bebida = 'Nenhuma';
                }
                
                await client.sendMessage(user, "Para finalizar, por favor, digite o seu endereço completo para a entrega (Ex: Rua das Flores, 123, Bairro, Cidade).");
                userStates[user].stage = 'confirmando_endereco';
                break;

            case 'confirmando_endereco':
                userStates[user].pedido.endereco = msg.body; // Pega o texto original com maiúsculas/minúsculas
                
                // Monta o resumo do pedido
                let resumo = `*Pedido Confirmado!* ✅\n\n🍕 *Sabor:* ${userStates[user].pedido.sabor}\n📏 *Tamanho:* ${userStates[user].pedido.tamanho}\n🥤 *Bebida:* ${userStates[user].pedido.bebida}\n\n🏠 *Endereço de Entrega:*\n${userStates[user].pedido.endereco}\n\nO seu pedido já está a ser preparado e deve chegar em aproximadamente *45 minutos*. Obrigado pela preferência!`;
                
                await client.sendMessage(user, resumo);
                
                // Finaliza a conversa
                delete userStates[user];
                break;

            default:
                // Resposta padrão caso o bot se perca
                await client.sendMessage(user, "Desculpe, não entendi. Digite 'menu' para ver as opções novamente.");
                userStates[user].stage = 'inicio';
                break;
        }
    });
};

// Exporta a função para que o server.js a possa importar
module.exports = attachLogic;
