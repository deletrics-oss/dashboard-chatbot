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
                    // (Lógica para ver pedido, truncada no original)
                } else {
                    await client.sendMessage(user, "Opção inválida. Digite o número da opção.");
                }
                break;

            // (Restante da lógica de estágios, como escolhendo_sabor, tamanho, bebida, endereço, truncada no original. Complete conforme necessário.)
        }
    });
};

// Exporta a função para que o server.js a possa importar
module.exports = attachLogic;
