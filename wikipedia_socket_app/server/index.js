const express = require('express');
const app = express();
const http = require("http");
const { Server } = require("socket.io")
const cors = require('cors');
const {RoomModel, Player, WikiPage} = require('./models/RoomModel.js');
const { cp } = require('fs');
const { join } = require('path');
const { callbackify } = require('util');

app.use(cors());
const server = http.createServer(app);
const maxRoomSize = 20;

/**the origin field in cors determines what urls this server will listen on. It's currently hard coded
* to my computer but this number will need to be adjusted if it runs on another 
* machine
**/
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
});

const rooms = {};
const users = {};


io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`)
    const {userId} = socket.handshake.query;

    //something has gone wrong if there is no userId
    if (!userId) {
        console.log("No userId provided. Disconnecting...");
        socket.disconnect();
        return;
    }

    if (users[userId]) {
        //when a user reconnects, reassign the current connection to the previous one
        console.log(`User ${userId} reconnected.`);
        users[userId].socket = socket;
        const roomNumber = users[userId].roomNumber;
        let username = users[userId].playerName || null;
        const room = rooms[roomNumber];
        socket.userId = userId;

        let response = joinRoom(roomNumber, username, socket);
        if (response.status === "failure") {
            users[userId].roomNumber = null;
            users[userId].playerName = null;
            socket.leave(roomNumber);
        } else {
            //if the user is rejoining the room, retrieve the state of the room
            io.to(roomNumber).emit("recieve_player_list", Object.values(room.players).map(player => 
                ({name: player.name, 
                score: player.score})
            ));

        }


    } else {
        //create a new connection for the user
        console.log(`New user ${userId} connected.`);

        users[userId] = {
            socket,
            playerName: null,
            roomNumber: null,
        };
    }

    socket.userId = userId;
    

    socket.on("player_join_room", (roomNumber, playerName, callback) => {

        let response = joinRoom(roomNumber, playerName, socket);
        if (response.status === "failure") {
            callback(response);
        } else {
            //retrieve the state of the room
            console.log(`User ${userId} joined room ${roomNumber} as ${playerName}. Sending player list.`);
            
            const targetRoom = io.sockets.adapter.rooms.get(roomNumber);
            if (targetRoom){
                console.log(`Sockets in adapter for room ${roomNumber}:`, Array.from (targetRoom.keys()));
            } else {
                console.warn(`Room ${roomNumber} was not found in adapter. Cannot emit`);
            }
            
            
            io.to(roomNumber).emit("recieve_player_list", Object.values(rooms[roomNumber].players).map(player =>
                ({name: player.name, 
                score: player.score})
            ));
            callback(response);
        }
    });

    socket.on("request_player_list", (roomNumber, callback) => {
        if (rooms[roomNumber]) {
            console.log(`Room ${roomNumber} requested player list.`);
            const playerList = Object.values(rooms[roomNumber].players).map(player =>
                ({name: player.name, 
                score: player.score})
            );
            socket.emit("recieve_player_list", playerList);
            callback({status: "success", players: playerList});
        } else {
            console.log(`Room ${roomNumber} requested player list but ${roomNumber} does not exist.`);
            callback({status: "error", message: `Room ${roomNumber} does not exist.`});
        }
    });

    socket.on("get_player_list", (roomNumber) => {
        if (rooms[roomNumber]) {
            console.log(`Room ${roomNumber} requested player list.`);
            io.to(roomNumber).emit("recieve_player_list", Object.values(rooms[roomNumber].players).map(player =>
                ({name: player.name, 
                score: player.score})
            ));        
        } else {
            console.log(`Room ${roomNumber} requested player list but ${roomNumber} does not exist.`);
        }
    });

    //for when a socket wants to leave a room
    socket.on("leave_room", (roomNumber, playerName, callback) => {
        if (!rooms[roomNumber]) {
            return callback({status: "error"});
        }
        const room = rooms[roomNumber];

        //decrement room count and remove empty rooms
        room.removePlayer(playerName);
        if (room.isEmpty()) {
            delete rooms[roomNumber];
        }

        socket.leave(roomNumber);
        users[socket.userId].roomNumber = null;
        users[socket.userId].playerName = null;
        callback({status: "success"});
        console.log(`User ${userId} left room ${roomNumber}`);
        io.to(roomNumber).emit("recieve_player_list", Object.values(room.players).map(player => 
            ({name: player.name, 
            score: player.score})
        ));;
    });


    socket.on("disconnecting", () => {
        const roomNumber = users[socket.userId].roomNumber;
        if (roomNumber && rooms[roomNumber]) {
            const room = rooms[roomNumber];
            room.removePlayer(users[socket.userId].playerName);
            socket.leave(roomNumber);
        } else {
            users[socket.userId].roomNumber = null;
            users[socket.userId].playerName = null;
        }

 
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });

    socket.on("end_session", () => {
        const roomNumber = users[socket.userId].roomNumber;
        console.log(`User ${socket.userId} ended session and disconnected.`);

        if (rooms[roomNumber]) {
            const room = rooms[roomNumber];
            room.removePlayer(users[socket.userId].playerName);
            if (room.isEmpty()) {
                delete rooms[roomNumber];
            }
        }
        delete users[socket.userId];
        socket.disconnect();
    });

    //depreciated
    socket.on("get_host_room_number", (callback) => {
        let number = Math.floor(Math.random() * 10000);
        while (rooms[number]) {
            number = Math.floor(Math.random() * 10000);
        }
        console.log(`Created room: ${number}`)
        callback({roomNumber: number});

    })

    socket.on("host_create_room", (callback) => {
        //gets an open room number between 1000 and 9999
        let roomNumber = generateRoomNumber();

        rooms[roomNumber] = new RoomModel(roomNumber);
        let playerName = "host";

        let response = joinRoom(roomNumber, playerName, socket);

        if (response.status === "failure") {
            callback(response);
        } else {
            //retrieve the state of the room
            console.log(`User ${userId} joined room ${roomNumber} as ${playerName}. Sending player list.`);
            
            const targetRoom = io.sockets.adapter.rooms.get(roomNumber);
            if (targetRoom){
                console.log(`Sockets in adapter for room ${roomNumber}:`, Array.from (targetRoom.keys()));
            } else {
                console.warn(`Room ${roomNumber} was not found in adapter. Cannot emit`);
            }
            
            
            // io.to(roomNumber).emit("recieve_player_list", Object.values(rooms[roomNumber].players).map(player =>
            //     ({name: player.name, 
            //     score: player.score})
            // ));


            const newResponse = {status: response.status,
                message: response.message,
                roomNumber: roomNumber
            };

            callback(newResponse);
        }
    });

    socket.on("start_game", (roomNumber) => {

        socket.to(roomNumber).emit("recieve_game_start");
    })

    socket.on("add_url", async (roomNumber, url, callback) => {
        if (!rooms[roomNumber]) {
            console.log(`Room ${roomNumber} does not exist. Cannot add url.`);
            return callback({status: "failure", message: `Room ${roomNumber} does not exist.`});
        }
        console.log(`Request to add url ${url} to room ${roomNumber}`);

        let result = await rooms[roomNumber].addUrl(url);
        console.log(`Attempted to add url ${url} to room ${roomNumber}. Result: ${result.status}`);
        return callback(result);


    });

    socket.on("clear_urls", (roomNumber, callback) => {
        if (!rooms[roomNumber]) {
            console.log(`Room ${roomNumber} does not exist. Cannot clear urls.`);
            return callback({status: "failure", message: `Room ${roomNumber} does not exist.`});
        }

        rooms[roomNumber].clearUrls();
        console.log(`Urls cleared for room ${roomNumber}`);
        callback({status: "success", message: `Urls cleared for room ${roomNumber}`});
    });

    socket.on("get_question", (roomNumber, callback) => {
        if (!rooms[roomNumber]) {
            console.log(`Room ${roomNumber} does not exist. Cannot send question.`);
            return callback({status: "failure", message: `Room ${roomNumber} does not exist.`});
        }

        let pageTitle = rooms[roomNumber].getCurrentTitle();
        console.log("page: " + pageTitle)


        if (!pageTitle || (pageTitle == "")) {
            console.log(`Could not find page ${pageTitle} in room ${roomNumber}`);
            return callback({status: "failure", message: `Could not find ${pageTitle} in ${roomNumber}`});
        }
        const question = rooms[roomNumber].wikiPages[pageTitle].getQuestion();

        const response = {status: "success", sentence: question.sentence, keywords: question.keywords, correctAnswer: question.correctAnswer};


        io.to(roomNumber).emit("receive_question", response);

        return callback(response);
    });
});

server.listen(3001, () => {
    console.log("Server running on port 3001");
});

function isValidRoom(roomNumber) {
    if (rooms[roomNumber] && (rooms[roomNumber].count >= maxRoomSize)) {
        return false;
    }
    return true;
}

function generateRoomNumber() {
    // Generates a random room number between 0 and 9999
    let roomNumber = Math.floor(Math.random() * 9000) + 1000;
    while (!isValidRoom(roomNumber)) {
        roomNumber = Math.floor(Math.random() * 9000) + 1000;
    }
    return roomNumber;
}

function joinRoom(roomNumber, playerName, socket) {
    if (!roomNumber || !playerName) {
        console.log(`Invalid room number or player name. User ${socket.userId} cannot join room.`);
        if (!roomNumber) {
            console.log("Room number is null");
        } else {
            console.log("Player name is null");
        }
        return {status: "failure", message: "Invalid room number or player name"};
    }

    if (rooms[roomNumber]) {
        if (rooms[roomNumber].count < maxRoomSize) {
            rooms[roomNumber].addPlayer(new Player(playerName));
            users[socket.userId].roomNumber = roomNumber;
            users[socket.userId].playerName = playerName;
            //join the socket to the room
            socket.join(roomNumber);
            console.log(`User ${socket.userId} joined room ${roomNumber}`);
            return {status: "success", message: `User ${socket.userId} joined room ${roomNumber}`};
        } else {
            console.log(`Room ${roomNumber} is full, User ${socket.userId} cannot join`);
            return {status: "failure", message: `Room ${roomNumber} is full`};
        }
    } else {
        console.log(`Room ${roomNumber} does not exist. User ${socket.userId} cannot join`);
        return {status: "failure", message: `Room ${roomNumber} does not exist`};
    }

}