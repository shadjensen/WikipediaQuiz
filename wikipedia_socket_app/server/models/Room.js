class Room{
    constructor(roomNumber) {
        this.count = 0;
        this.roomNumber = roomNumber;
        this.players = {};
        //only track active players, but keep a list of archived player states
        //for sudden disconnections or re-joins
        this.playerArchive = {};
    }

    addPlayer(player) {
        
        if (this.playerArchive[player.name]) {
            // If player is archived, restore them
            this.players[player.name] = this.playerArchive[player.name];
            delete this.playerArchive[player.name];
        }
        this.players[player.name] = player;
        this.count += 1;
    }

    removePlayer(playerName) {
        this.playerArchive[playerName] = this.players[playerName];
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

module.exports = {Room, Player};