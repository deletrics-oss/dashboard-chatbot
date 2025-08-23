// fight-arcade/fight-arcade.js
class FightArcade {
    constructor() {
        this.players = new Map();
        this.scoreboard = new Map();
    }

    addPlayer(phoneNumber, name) {
        this.players.set(phoneNumber, { name, score: 0 });
        return { success: true, message: `${name} adicionado ao arcade!` };
    }

    updateScore(phoneNumber, score) {
        const player = this.players.get(phoneNumber);
        if (player) {
            player.score += score;
            this.scoreboard.set(phoneNumber, player.score);
            return { success: true, score: player.score };
        }
        return { success: false, message: 'Jogador não encontrado' };
    }

    getLeaderboard() {
        return Array.from(this.scoreboard.entries())
            .map(([phone, score]) => ({ phone, score }))
            .sort((a, b) => b.score - a.score);
    }
}

const arcade = new FightArcade();
module.exports = arcade;
