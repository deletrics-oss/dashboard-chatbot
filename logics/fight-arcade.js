// logics/fight-arcade.js

const attachLogic = (client, io, sessions) => {
    
    const LINKS = {
        MERCADO_LIVRE: "https://www.mercadolivre.com.br/perfil/FIGHTARCADE",
        SHOPEE: "https://acesse.one/fliperamasnashopee",
        SITE_MDF: "https://www.fightarcade.com.br/mdf/",
        SITE_METAL: "https://www.fightarcade.com.br/metal/",
        CATALOGO_ESTAMPAS: "https://acesse.one/fightarcadeestampa",
        GRUPO_WHATSAPP: "https://chat.whatsapp.com/EqOUWXbKhHB6FrFdfogjRC",
        VENDAS_DIRETAS_WHATSAPP: "https://wa.me/5511984343166",
    };

    async function sendMainMenu(user, intro = "") {
        const mainMenuText = `${intro}O que gostaria de fazer agora?\n\n*1️⃣ - Ver modelos e preços*\n*2️⃣ - Ver opções de estampas*\n*3️⃣ - Suporte Técnico*\n*4️⃣ - Finalizar compra*\n*5️⃣ - Falar com um atendente*`;
        await client.sendMessage(user, mainMenuText);
        sessions.userStates[user].stage = 'aguardando_menu_principal';
    }

    client.on('message', async (msg) => {
        if (!msg.from.endsWith('@c.us')) return;

        const contact = await msg.getContact();
        const contactName = contact.pushname || msg.from.replace('@c.us', '');
        
        io.emit('new_message', {
            clientId: client.options.clientId.split('-')[1], // Extrai o nome do dispositivo
            username: client.options.clientId.split('-')[0], // Extrai o nome do utilizador
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

        if (messageBody.match(/^(oi|olá|ola|menu|começar)/i)) {
            userStates[user] = { stage: 'inicio' };
            await chat.sendStateTyping();
            await client.sendMessage(user, `Olá, ${contactName.split(" ")[0]}! 👋 Sou o assistente virtual da Fight Arcade.`);
            await sendMainMenu(user);
            return;
        }

        // Lógica completa dos menus e respostas
        switch (userStates[user]?.stage) {
            case 'aguardando_menu_principal':
                // ... cole aqui a sua lógica de switch/case completa para o menu principal ...
                if (messageBody === '1') {
                    await client.sendMessage(user, "A carregar modelos...");
                    userStates[user].stage = 'aguardando_tipo_produto';
                }
                break;
            // ... adicione aqui os outros cases (aguardando_tipo_produto, etc.) ...
        }
    });
};

module.exports = attachLogic;
