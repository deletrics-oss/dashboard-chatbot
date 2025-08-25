// logics/delivery-pizzaria.js

module.exports = (client, io, session, addLog) => {
    const userStates = {};

    client.on('message', async (msg) => {
        if (!msg.from.endsWith('@c.us')) return;

        const user = msg.from;
        const text = msg.body.trim().toLowerCase();
        const chat = await msg.getChat();

        addLog(`📩 [Pizzaria] Mensagem de ${user}: ${msg.body}`);

        if (!userStates[user]) {
            userStates[user] = { stage: 'inicio', pedido: {} };
        }

        if (userStates[user].stage === 'inicio' &&
            (text === 'oi' || text === 'olá' || text === 'ola' || text === 'menu')) {
            await chat.sendStateTyping();
            await client.sendMessage(user,
                `🍕 Bem-vindo à *Pizzaria Rápida*!\n\nEscolha uma opção:\n\n` +
                `*1.* Ver Sabores\n` +
                `*2.* Ver meu pedido\n` +
                `*3.* Falar com atendente`
            );
            userStates[user].stage = 'aguardando_menu';
            return;
        }

        switch (userStates[user].stage) {
            case 'aguardando_menu':
                if (text === '1') {
                    await client.sendMessage(user,
                        `Temos os seguintes sabores:\n\n` +
                        `*1.* Calabresa\n*2.* Mozzarella\n*3.* Frango com Catupiry\n*4.* Portuguesa\n\nDigite o número do sabor desejado.`
                    );
                    userStates[user].stage = 'escolhendo_sabor';
                } else if (text === '2') {
                    if (userStates[user].pedido.sabor) {
                        await client.sendMessage(user,
                            `📋 Seu pedido atual: Pizza ${userStates[user].pedido.sabor}, tamanho ${userStates[user].pedido.tamanho || "?"}, bebida ${userStates[user].pedido.bebida || "?"}.`
                        );
                    } else {
                        await client.sendMessage(user, `Você ainda não iniciou um pedido. Digite *menu* para começar.`);
                    }
                } else if (text === '3') {
                    await client.sendMessage(user, `🙋 Transferindo para um atendente humano...`);
                    delete userStates[user];
                } else {
                    await client.sendMessage(user, `Opção inválida. Digite *menu* para voltar.`);
                }
                break;

            case 'escolhendo_sabor':
                const sabores = { '1': 'Calabresa', '2': 'Mozzarella', '3': 'Frango com Catupiry', '4': 'Portuguesa' };
                if (sabores[text]) {
                    userStates[user].pedido.sabor = sabores[text];
                    await client.sendMessage(user,
                        `Ótimo! Qual tamanho deseja?\n\n*1.* Média (6 fatias)\n*2.* Grande (8 fatias)\n*3.* Família (12 fatias)`
                    );
                    userStates[user].stage = 'escolhendo_tamanho';
                } else {
                    await client.sendMessage(user, `Sabor inválido. Digite o número do sabor.`);
                }
                break;

            case 'escolhendo_tamanho':
                const tamanhos = { '1': 'Média', '2': 'Grande', '3': 'Família' };
                if (tamanhos[text]) {
                    userStates[user].pedido.tamanho = tamanhos[text];
                    await client.sendMessage(user,
                        `Deseja adicionar uma bebida?\n\n*1.* Coca-Cola 2L\n*2.* Guaraná 2L\n*3.* Água sem gás\n*4.* Nenhuma`
                    );
                    userStates[user].stage = 'escolhendo_bebida';
                } else {
                    await client.sendMessage(user, `Tamanho inválido. Digite o número correspondente.`);
                }
                break;

            case 'escolhendo_bebida':
                const bebidas = { '1': 'Coca-Cola 2L', '2': 'Guaraná 2L', '3': 'Água sem gás' };
                if (bebidas[text]) {
                    userStates[user].pedido.bebida = bebidas[text];
                } else {
                    userStates[user].pedido.bebida = 'Nenhuma';
                }
                await client.sendMessage(user, `Digite seu endereço completo para entrega.`);
                userStates[user].stage = 'confirmando_endereco';
                break;

            case 'confirmando_endereco':
                userStates[user].pedido.endereco = msg.body;
                const resumo =
                    `✅ *Pedido confirmado!*\n\n` +
                    `🍕 Pizza: ${userStates[user].pedido.sabor}\n` +
                    `📏 Tamanho: ${userStates[user].pedido.tamanho}\n` +
                    `🥤 Bebida: ${userStates[user].pedido.bebida}\n` +
                    `🏠 Endereço: ${userStates[user].pedido.endereco}\n\n` +
                    `⏳ Entrega em até 40 minutos. Obrigado por pedir na Pizzaria Rápida!`;
                await client.sendMessage(user, resumo);
                delete userStates[user]; // finaliza
                break;
        }
    });
};
