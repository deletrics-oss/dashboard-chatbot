// logics/fight-arcade.js

// A função principal que liga a lógica do chatbot ao servidor
const attachLogic = (client, io, clientSession, addEntry) => {
    
    // Links específicos para este chatbot
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

    // Função para enviar mensagens e registá-las no dashboard
    const sendMessage = async (user, text) => {
        await client.sendMessage(user, text);
        addEntry('message', {
            from: 'Bot',
            to: user.replace('@c.us', ''),
            body: text,
            type: 'bot'
        });
    };

    // Função para enviar o menu principal
    async function sendMainMenu(user, intro = "") {
        const mainMenuText = `${intro}O que gostaria de fazer agora?\n\n*1️⃣ - Ver modelos e preços*\n*2️⃣ - Ver opções de estampas*\n*3️⃣ - Suporte Técnico*\n*4️⃣ - Finalizar compra*\n*5️⃣ - Falar com um atendente*`;
        await sendMessage(user, mainMenuText);
        clientSession.sessions.userStates[user].stage = 'aguardando_menu_principal';
    }

    // Ouve por novas mensagens
    client.on('message', async (msg) => {
        if (!msg.from.endsWith('@c.us')) return;

        const contact = await msg.getContact();
        const contactName = contact.pushname || msg.from.replace('@c.us', '');

        // (O conteúdo foi truncado na entrada original, mas inclui lógica de menus, respostas e preços. Complete com o original.)
    });
};

module.exports = attachLogic;
