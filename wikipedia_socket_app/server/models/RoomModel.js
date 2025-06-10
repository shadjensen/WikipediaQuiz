
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

    async addUrl(title) {
        if (!this.isValidTitle(title)){
            return {status: "error", message: `Invalid title for: ${title}`}
        }

        const cheerio = require('cheerio');

        
        const html = await this.getHtmlFromTitle(title);
        if (!html) {
            return {status: "error", message: `Failed to fetch HTML for title: ${title}`}
        }
        console.log(`Successfully fetched HTML`);

        const page = new WikiPage(title);
        
        //cheerio typically uses $ to represent the DOM to better align with jQuery, but seeing as we won't be using jQuery, dom
        //will be used instead to make the code more readable.
        const dom = cheerio.load(html);


        const paragraphs = dom('p').toArray();

        let foundSentences = [];
        for (const element of paragraphs) {
            const p = dom(element);

            //finds all p tags that have internal links
            const links = p.find('a[href^="/"]');
            if (links.length > 0) {

                //find all children of the p tag and replace all that aren't links with their inner text
                //replace all a tags with $$$ which will be used as an escape character to identify links later
                p.find('*').each((_, child) => {
                    if (child.tagName === 'sup') {
                        dom(child).replaceWith("")
                    } else if (child.tagName !== 'a') {
                        dom(child).replaceWith(dom(child).text());
                    } else {
                        dom(child).replaceWith("$$$" + dom(child).text() + "$$$");
                    }
                });


                let innerTextNoted = p.text();
                //removes all bracketed numbers, which wikipedia uses to denote references to footnotes. Also replace [update] blocks
                let innerText = innerTextNoted.replace(/\[\d+\]/g, '')
                innerText = innerText.replace('[update]', '');

                //sbd splits sentences without splitting on common abbreviations like St. or Dr. 
                const sbd = require('sbd');
                let unparsedSentences = sbd.sentences(innerText);
                //now ignore all sentences that do not have a link
                for (const sentence of unparsedSentences) {
                    if (sentence.includes("$$$") !== -1) {
                        //matchAll returns an iterator both with the inner text and with the bounding $$$, so the inner text is mapped to foundKeywords for use
                        const innerLinks = [...sentence.matchAll(/\$\$\$(.*?)\$\$\$/g)];
                        const foundKeywords = innerLinks.map(match => match[1]); 

                        if (foundKeywords.length > 0) {
                            foundSentences.push({sentence: sentence, keywords: foundKeywords});
                        }
                    }
                }
            }
        }

        console.log(foundSentences);
        page.sentences = foundSentences;
        page.sentenceCount = foundSentences.length;
        console.log(`Found ${page.sentenceCount} sentences in page: ${title}`);
        this.wikiPages[title] = page;

        return {status: "success", message: `Successfully added url: ${title}`, html: html};
    }

    async addRandomPages(pageCount) {
        const randomPagePool = ["Alec Benjamin", "Hank Green", "Pyramid", "Germany", "Dijkstra%27s_algorithm", "John Krasinski", "France", "RGB Color Model"];

        let selectedPages = []
        for (let count in pageCount) {

            let randomPageIndex = Math.floor(Math.random()*randomPagePool.count()) 
            await this.addUrl(randomPagePool[randomPageIndex])
        }
    }

    isValidTitle(url) {
        return true;
    }

    async getHtmlFromTitle(title) {
        const encodedTitle = encodeURIComponent(title);
        const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/html/${encodedTitle}`;

        try {
            const response = await fetch(apiUrl);

            //catch errors
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`URL not found: ${title}`);
                    throw new Error(`URL not found: ${title}`);
                } else {
                    throw new Error(`Failed to fetch URL: ${title}`);
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

class WikiPage {
    constructor(title) {
        this.sentenceCount = 0;
        this.title = "";
        //a series of sentences saved as {sentence, keyword}
        this.sentences = [];
    }


    getQuestion() {
        //gets a random index between 0 and sentence count
        const questionIndex = Math.floor(Math.random()*this.sentenceCount);

        const sentenceKeywordCount = this.sentences[questionIndex].keywords.length;
        const selectedKeywordIndex = Math.floor(Math.random()* sentenceKeywordCount);
        const correctKeyword = this.sentences[questionIndex].keywords[selectedKeywordIndex];
        
        //this is the number of options a player is allowed to choose from. Where many popular quiz games give 4, context makes 4 significantly too
        //easy so 6 is a recommended default amount
        const keywordSelectionCount = 6;
        const maxAttemptLimit = 50;
        const defaultWords = ["American", "Building", "Children", "District", "Decision", "National", "Organize", "Program", "Property", "Religion", "Required", "Services", "students", "Complete"];

        const sentenceDictCount = Object.keys(this.sentences).length
        let wordSet = [correctKeyword];
        //keyword options are taken from nearby sentences to increase the likelihood of them being relevant to the given sentence.
        //To prevent infinite looping that could occur on incredibly small wikipedia pages, an attempt count will be tracked and after 
        //a maxAttemptLimit number of checks to nearby sentences, words will instead be filled in from an external dictionary.
        while (wordSet.length < keywordSelectionCount){
            let searchRange = 1;
            let searchOffset = 1;
            let attemptCount = 0;

            let wordFound = false;
            while (!wordFound) {
                //multiplies searchOffset by either 1 or -1 
                searchOffset = searchOffset * Math.pow(-1, Math.floor(Math.random()*2));
                //if the selected sentence exists in an index within the sentence list, and isn't the original sentence, proceed
                if ((searchOffset * searchRange > -1) && (searchOffset * searchRange < sentenceDictCount) && (searchOffset * searchRange != 0)) {

                    const selectedSentence = this.sentences[searchOffset * searchRange];

                    const pickedKeywordIndex = Math.floor(Math.random() * selectedSentence.keywords.length)
                    const pickedKeyword = selectedSentence.keywords[pickedKeywordIndex];

                    if (!wordSet.includes(pickedKeyword)) {
                        wordFound = true;
                        wordSet.push(pickedKeyword);
                    } else {
                        //on a failed attempt, increase the max search range and increment the attempt count.
                        attemptCount++;
                        searchRange++;
                    }
                } else {
                    attemptCount++;
                    searchRange++;
                }

                //cycle through default words until one is found that is not in the set
                //assuming enough attempts exist on the actual page
                //this is a prevision that exists almost exclusively for pages that actually don't have enough valid sentences, but should rarely be used on
                //a vast majority of wikipedia pages.
                if (attemptCount >= maxAttemptLimit) {
                    while(!wordFound) {
                        const pickIndex = Math.floor(Math.random()*defaultWords.count());
                        const pickedKeyword = defaultWords[pickIndex];

                        if (!wordSet.includes(pickedKeyword)) {
                            wordFound = true;
                            wordSet.push(pickedKeyword);
                        }
                    }
                }
            }





        }

        let returnedSentence = this.sentences[questionIndex].sentence;
        returnedSentence = returnedSentence.replace("/\$\$\$/g", "")
        returnedSentence = returnedSentence.replace(`/${correctKeyword}/g`, "______")

        console.log(`sentence: ${returnedSentence} --- keywords: ${wordSet} --- correct_answer: ${correctKeyword}`)
        return {sentence: returnedSentence, keywords: wordSet, correctAnswer: correctKeyword};


    }


}

module.exports = {RoomModel: RoomModel, Player: Player, WikiPage: WikiPage};