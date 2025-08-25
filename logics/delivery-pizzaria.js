module.exports = (client, io, session, addLog) => {
    const userStates = {};

    client.on(\'message\', async (msg) => {
        if (msg.from.endsWith(\'@c.us\')) return; // Ignora mensagens de status ou de grupos

        const user = msg.from;
        const text = msg.body.trim().toLowerCase();
        const chat = await msg.getChat();

        addLog(`[Pizzaria] Mensagem de ${user}: ${msg.body}`);

        if (!userStates[user]) {
            userStates[user] = { stage: \'inicio\', pedido: {} };
        }

        let currentStage = userStates[user].stage;

        switch (currentStage) {
            case \'inicio\':
                if (text === \'oi\' || text === \'ola\' || text === \'menu\') {
                    await chat.sendStateTyping();
                    await client.sendMessage(user, 
                        "🍕 Bem-vindo à Pizzaria Rápida!\n\nEscolha uma opção:\n\n" +
                        "*1.* Ver Sabores\n" +
                        "*2.* Ver meu pedido\n" +
                        "*3.* Falar com atendente"
                    );
                    userStates[user].stage = \'aguardando_menu\';
                } else {
                    await chat.sendStateTyping();
                    await client.sendMessage(user, "Desculpe, não entendi. Por favor, digite \'menu\' para ver as opções.");
                }
                break;

            case \'aguardando_menu\':
                switch (text) {
                    case \'1\':
                        await chat.sendStateTyping();
                        await client.sendMessage(user, 
                            "Nossos sabores:\n\n" +
                            "*Calabresa* - R$ 35,00\n" +
                            "*Frango com Catupiry* - R$ 40,00\n" +
                            "*Marguerita* - R$ 38,00\n\n" +
                            "Digite o número do sabor que deseja pedir ou \'voltar\' para o menu principal."
                        );
                        userStates[user].stage = \'aguardando_sabor\';
                        break;
                    case \'2\':
                        await chat.sendStateTyping();
                        if (Object.keys(userStates[user].pedido).length > 0) {
                            let pedidoResumo = "Seu pedido atual:\n\n";
                            for (const sabor in userStates[user].pedido) {
                                pedidoResumo += `- ${sabor}: ${userStates[user].pedido[sabor]} unidade(s)\n`;
                            }
                            pedidoResumo += "\nPara finalizar, digite \'finalizar\'. Para adicionar mais itens, digite \'menu\'.";
                            await client.sendMessage(user, pedidoResumo);
                            userStates[user].stage = \'aguardando_finalizacao\';
                        } else {
                            await client.sendMessage(user, "Você ainda não tem nenhum pedido. Digite \'menu\' para começar.");
                            userStates[user].stage = \'inicio\';
                        }
                        break;
                    case \'3\':
                        await chat.sendStateTyping();
                        await client.sendMessage(user, "Ok, um atendente entrará em contato em breve. Por favor, aguarde.");
                        userStates[user].stage = \'atendente\';
                        break;
                    default:
                        await chat.sendStateTyping();
                        await client.sendMessage(user, "Opção inválida. Por favor, escolha 1, 2 ou 3.");
                        break;
                }
                break;

            case \'aguardando_sabor\':
                const saboresDisponiveis = {
                    \'calabresa\': 35.00,
                    \'frango com catupiry\': 40.00,
                    \'marguerita\': 38.00
                };

                if (saboresDisponiveis[text]) {
                    userStates[user].pedido[text] = (userStates[user].pedido[text] || 0) + 1;
                    await chat.sendStateTyping();
                    await client.sendMessage(user, `Adicionado 1x ${text} ao seu pedido. Deseja adicionar mais algo ou \'finalizar\'?`);
                    userStates[user].stage = \'aguardando_finalizacao\';
                } else if (text === \'voltar\') {
                    await chat.sendStateTyping();
                    await client.sendMessage(user, "Voltando ao menu principal. Escolha uma opção:\n\n*1.* Ver Sabores\n*2.* Ver meu pedido\n*3.* Falar com atendente");
                    userStates[user].stage = \'aguardando_menu\';
                } else {
                    await chat.sendStateTyping();
                    await client.sendMessage(user, "Sabor inválido. Por favor, escolha um sabor da lista ou digite \'voltar\'.");
                }
                break;

            case \'aguardando_finalizacao\':
                if (text === \'finalizar\') {
                    await chat.sendStateTyping();
                    let total = 0;
                    let resumoFinal = "Seu pedido final:\n\n";
                    for (const sabor in userStates[user].pedido) {
                        const preco = saboresDisponiveis[sabor];
                        const quantidade = userStates[user].pedido[sabor];
                        resumoFinal += `- ${quantidade}x ${sabor} (R$ ${(preco * quantidade).toFixed(2)})\n`;
                        total += preco * quantidade;
                    }
                    resumoFinal += `\nTotal: R$ ${total.toFixed(2)}\n\nSeu pedido foi enviado! Agradecemos a preferência.`;
                    await client.sendMessage(user, resumoFinal);
                    delete userStates[user]; // Limpa o estado do usuário
                } else if (text === \'menu\') {
                    await chat.sendStateTyping();
                    await client.sendMessage(user, "Voltando ao menu principal. Escolha uma opção:\n\n*1.* Ver Sabores\n*2.* Ver meu pedido\n*3.* Falar com atendente");
                    userStates[user].stage = \'aguardando_menu\';
                } else {
                    await chat.sendStateTyping();
                    await client.sendMessage(user, "Opção inválida. Digite \'finalizar\' para concluir ou \'menu\' para adicionar mais itens.");
                }
                break;

            case \'atendente\':
                // Se o usuário está aguardando atendente, qualquer mensagem é para o atendente
                addLog(`[ATENDENTE] Mensagem de ${user}: ${msg.body}`);
                // Aqui você pode integrar com um sistema de tickets ou notificar um atendente real
                await chat.sendStateTyping();
                await client.sendMessage(user, "Sua mensagem foi encaminhada para um atendente. Por favor, aguarde.");
                break;

            default:
                await chat.sendStateTyping();
                await client.sendMessage(user, "Ocorreu um erro. Por favor, digite \'menu\' para recomeçar.");
                userStates[user].stage = \'inicio\';
                break;
        }
    });
};
