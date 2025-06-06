class RoomModel{
    constructor(roomNumber) {
        this.count = 0;
        this.roomNumber = roomNumber;
        this.players = {};
        //only track active players, but keep a list of archived player states
        //for sudden disconnections or re-joins
        this.playerArchive = {};
        //stores all titles of pages
        this.urls = [];
        //stores html data of pages with key pair {title, html}
        this.wikiPages = {};
        this.urlCount = 0;
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

    async addUrl(url) {
        if (!this.isValidUrl(url)){
            return {status: "error", message: `Invalid title for: ${url}`}
        }

        
        const html = await this.getUrlHtml(url);
        if (!html) {
            return {status: "error", message: `Failed to fetch HTML for title: ${url}`}
        }
        console.log(`Successfully fetched HTML`);
        console.log(html);      

        return {status: "success", message: `Successfully added url: ${url}`, html: html};
    }

    isValidUrl(url) {
        return true;
    }

    async getUrlHtml(url) {
        const encodedTitle = encodeURIComponent(url);
        const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/html/${encodedTitle}`;

        try {
            const response = await fetch(apiUrl);

            //catch errors
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`URL not found: ${url}`);
                    throw new Error(`URL not found: ${url}`);
                } else {
                    throw new Error(`Failed to fetch URL: ${url}`);
                }
            }

            //assume errors have been caught.
            const html = await response.text();
            return html;
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    clearUrls() {

    }
}

class Player{
    constructor(name) {
        this.name = name;
        this.score = 0;
    }
}

module.exports = {RoomModel: RoomModel, Player};