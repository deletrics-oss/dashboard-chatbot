// logics/fight-arcade.js

module.exports = (client, io, session, addLog) => {
    client.on('message', async (msg) => {
        if (!msg.from.endsWith('@c.us')) return; // Ignora grupos

        const chat = await msg.getChat();
        const user = msg.from;
        const text = msg.body.trim().toLowerCase();

        addLog(`📩 [FightArcade] Mensagem de ${user}: ${msg.body}`);

        if (text === 'menu' || text === 'oi' || text === 'olá' || text === 'ola') {
            await client.sendMessage(user,
                `👋 Bem-vindo à *FightArcade*!\n\nEscolha uma opção:\n\n` +
                `*1.* ℹ️ Informações sobre placas\n` +
                `*2.* 🛠️ Suporte técnico\n` +
                `*3.* 📦 Status do pedido\n` +
                `*4.* 🙋 Falar com atendente`
            );
            session.stage = 'menu';
            return;
        }

        switch (session.stage) {
            case 'menu':
                if (text === '1') {
                    await client.sendMessage(user,
                        `🔌 Temos placas compatíveis com controles de luta, suporte USB, função Turbo e integração com fliperamas.\n\nDigite *menu* para voltar.`
                    );
                } else if (text === '2') {
                    await client.sendMessage(user,
                        `🛠️ Para suporte técnico, envie uma foto do problema ou descreva sua dúvida.\n\nDigite *menu* para voltar.`
                    );
                } else if (text === '3') {
                    await client.sendMessage(user,
                        `📦 Informe o número do seu pedido para consultar o status.\n\nDigite *menu* para voltar.`
                    );
                } else if (text === '4') {
                    await client.sendMessage(user, `🙋 Encaminhando para um atendente humano...`);
                    session.stage = null; // Finaliza
                } else {
                    await client.sendMessage(user, `Opção inválida. Digite *menu* para voltar.`);
                }
                break;
        }
    });
};
