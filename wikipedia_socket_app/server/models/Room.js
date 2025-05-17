class Room{
    constructor(roomNumber) {
        this.count = 0;
        this.roomNumber = roomNumber;
        this.players = {};
    }

    addPlayer(player) {
        this.players[player.name] = player;
        this.count += 1;
    }

    removePlayer(playerName) {
        delete this.players[playerName];
        this.count -= 1;
    }

    isEmpty() {
        return (this.count <= 0 && this.players.count <= 0);
    }
}

class Player{
    constructor(name) {
        this.name = name;
        this.score = 0;
    }
}

module.exports = Room;