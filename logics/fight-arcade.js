// logics/fight-arcade.js
module.exports = function (io, addLog) {
  io.on("connection", (socket) => {
    socket.on("fightArcadeMessage", (msg) => {
      try {
        if (!msg || !msg.body || typeof msg.body !== "string") {
          addLog("⚠️ Mensagem inválida recebida em fight-arcade");
          return;
        }

        const text = msg.body.trim().toLowerCase();

        // === INÍCIO: Saudação ===
        if (text.match(/^(oi|olá|fala|salve)$/)) {
          socket.emit("fightArcadeResponse", {
            reply: "👊 Bem-vindo ao Fight Arcade! Escolha uma opção.",
          });
          addLog("🤖 FightArcade respondeu com saudação");
        }

        // === SUPORTE ===
        else if (text.includes("suporte")) {
          socket.emit("fightArcadeResponse", {
            reply: "🔧 Suporte Técnico: descreva seu problema.",
          });
          addLog("📞 FightArcade abriu suporte técnico");
        }

        // === OPÇÃO PADRÃO ===
        else {
          socket.emit("fightArcadeResponse", {
            reply: "❓ Não entendi. Digite 'suporte' ou 'oi'.",
          });
          addLog("❌ FightArcade não entendeu a mensagem");
        }
      } catch (err) {
        addLog(`🔥 Erro em fight-arcade: ${err.message}`);
      }
    });
  });
};
