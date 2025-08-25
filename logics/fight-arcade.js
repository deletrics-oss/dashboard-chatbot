module.exports = (client, io, session, addLog) => {
    const userStates = {};

    client.on(\'message\', async (msg) => {
        if (msg.from.endsWith(\'@c.us\')) return; // Ignora grupos

        const user = msg.from;
        const text = msg.body.trim().toLowerCase();
        const chat = await msg.getChat();

        addLog(`[FightArcade] Mensagem de ${user}: ${msg.body}`);

        if (!userStates[user]) {
            userStates[user] = { stage: \'menu\' };
        }

        let currentStage = userStates[user].stage;

        switch (currentStage) {
            case \'menu\':
                if (text === \'menu\' || text === \'oi\' || text === \'ola\') {
                    await chat.sendStateTyping();
                    await client.sendMessage(user,
                        "🎮 Bem-vindo à FightArcade!\n\nEscolha uma opção:\n\n" +
                        "*1.* Informações sobre placas\n" +
                        "*2.* Suporte técnico\n" +
                        "*3.* Status do pedido\n" +
                        "*4.* Falar com atendente"
                    );
                    userStates[user].stage = \'aguardando_menu_fight_arcade\';
                } else {
                    await chat.sendStateTyping();
                    await client.sendMessage(user, "Desculpe, não entendi. Por favor, digite \'menu\' para ver as opções.");
                }
                break;

            case \'aguardando_menu_fight_arcade\':
                switch (text) {
                    case \'1\':
                        await chat.sendStateTyping();
                        await client.sendMessage(user,
                            "Temos placas compatíveis com controles de luta, suporte USB, função Turbo e integração com fliperamas.\n" +
                            "Para mais detalhes, visite nosso site ou digite \'menu\' para voltar."
                        );
                        userStates[user].stage = \'menu\';
                        break;
                    case \'2\':
                        await chat.sendStateTyping();
                        await client.sendMessage(user,
                            "Para suporte técnico, por favor, envie uma foto do problema ou descreva sua dúvida detalhadamente.\n" +
                            "Nossa equipe entrará em contato o mais breve possível.\n" +
                            "Digite \'menu\' para voltar ao menu principal."
                        );
                        userStates[user].stage = \'menu\';
                        break;
                    case \'3\':
                        await chat.sendStateTyping();
                        await client.sendMessage(user,
                            "Para verificar o status do seu pedido, por favor, informe o número do seu pedido.\n" +
                            "Digite \'menu\' para voltar."
                        );
                        userStates[user].stage = \'aguardando_numero_pedido\';
                        break;
                    case \'4\':
                        await chat.sendStateTyping();
                        await client.sendMessage(user,
                            "Encaminhando para um atendente humano. Por favor, aguarde um momento. " +
                            "Seu atendimento será iniciado em breve."
                        );
                        userStates[user].stage = \'atendente_fight_arcade\';
                        break;
                    default:
                        await chat.sendStateTyping();
                        await client.sendMessage(user, "Opção inválida. Por favor, escolha 1, 2, 3 ou 4.");
                        break;
                }
                break;

            case \'aguardando_numero_pedido\':
                // Aqui você pode adicionar a lógica para verificar o número do pedido
                await chat.sendStateTyping();
                await client.sendMessage(user, `Você informou o número de pedido: ${text}. Estamos verificando...\nDigite \'menu\' para voltar.`);
                userStates[user].stage = \'menu\';
                break;

            case \'atendente_fight_arcade\':
                // Qualquer mensagem aqui é para o atendente
                addLog(`[ATENDENTE FIGHTARCADE] Mensagem de ${user}: ${msg.body}`);
                await chat.sendStateTyping();
                await client.sendMessage(user, "Sua mensagem foi encaminhada para um atendente. Por favor, aguarde.");
                break;

            default:
                await chat.sendStateTyping();
                await client.sendMessage(user, "Ocorreu um erro. Por favor, digite \'menu\' para recomeçar.");
                userStates[user].stage = \'menu\';
                break;
        }
    });
};

