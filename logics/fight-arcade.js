// logics/fight-arcade.js

// Esta função será chamada pelo server.js e receberá a instância do cliente (bot) e o socket.io
const attachLogic = (client, io, sessions) => {
    
    // Links específicos para este chatbot
    const LINKS = {
        MERCADO_LIVRE: "https://www.mercadolivre.com.br/perfil/FIGHTARCADE",
        SHOPEE: "https://acesse.one/fliperamasnashopee",
        SITE_MDF: "https://www.fightarcade.com.br/mdf/",
        SITE_METAL: "https://www.fightarcade.com.br/metal/",
        CATALOGO_ESTAMPAS: "https://acesse.one/fightarcadeestampa",
        GRUPO_WHATSAPP: "https://chat.whatsapp.com/EqOUWXbKhHB6FrFdfogjRC",
        VENDAS_DIRETAS_WHATSAPP: "https://wa.me/5511984343166",
    };

    // Função para enviar o menu principal
    async function sendMainMenu(user, intro = "") {
        const mainMenuText = `${intro}O que gostaria de fazer agora?\n\n*1️⃣ - Ver modelos e preços*\n*2️⃣ - Ver opções de estampas*\n*3️⃣ - Suporte Técnico*\n*4️⃣ - Finalizar compra*\n*5️⃣ - Falar com um atendente*`;
        await client.sendMessage(user, mainMenuText);
        sessions.userStates[user].stage = 'aguardando_menu_principal';
    }

    // Ouve por novas mensagens
    client.on('message', async (msg) => {
        // Ignora mensagens que não são de utilizadores individuais
        if (!msg.from.endsWith('@c.us')) return;

        const contact = await msg.getContact();
        const contactName = contact.pushname || msg.from.replace('@c.us', '');
        
        // Emite a mensagem para o dashboard
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
        const messageBody = msg.body.trim();

        if (!userStates[user]) {
            userStates[user] = { stage: 'inicio' };
        }

        if (messageBody.match(/^(oi|olá|ola|bom dia|boa tarde|boa noite|menu|começar)/i)) {
            userStates[user] = { stage: 'inicio' };
            await chat.sendStateTyping();
            await client.sendMessage(user, `Olá, ${contactName.split(" ")[0]}! 👋 Sou o assistente virtual da Fight Arcade.`);
            await sendMainMenu(user);
            return;
        }

        // Lógica dos menus e respostas (switch/case)
        // ... cole aqui toda a sua lógica de switch/case que já tínhamos ...
        // Por exemplo:
        switch (userStates[user]?.stage) {
            case 'aguardando_menu_principal':
                if (messageBody === '1') {
                    await client.sendMessage(user, "A carregar modelos...");
                    userStates[user].stage = 'aguardando_tipo_produto';
                }
                // ... resto das opções ...
                break;
            // ... resto dos cases ...
        }
    });
};

// Exporta a função para que o server.js a possa importar
module.exports = attachLogic;
