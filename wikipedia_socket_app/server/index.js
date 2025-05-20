const express = require('express');
const app = express();
const http = require("http");
const { Server } = require("socket.io")
const cors = require('cors');
const {Room, Player} = require('./models/Room.js');
const { cp } = require('fs');

app.use(cors());
const server = http.createServer(app);
const maxRoomSize = 20;

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
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
    

    //logic for when a socket wants to join a room
    socket.on("join_room", (roomNumber, callback) => {
        if (isValidRoom(roomNumber)) {
            if (!rooms[roomNumber]) {
                console.log(`Room ${roomNumber} does not exist. ${userId} cannot join.`);
                return callback({status: "error", message: "Room does not exist or full"});
            }

            socket.join(roomNumber);
            callback({status: "success"});
            console.log(`User ${userId} joined room ${roomNumber}`);

        } else {
            callback({status: "error", message: "Room does not exist or full"});
        }
    });

    socket.on("player_join_room", (roomNumber, playerName, callback) => {
        if (rooms[roomNumber]) {
            const player = new Player(playerName);
            rooms[roomNumber].addPlayer(player);
            const room = rooms[roomNumber];

            users[socket.userId].playerName = playerName;
            users[socket.userId].roomNumber = roomNumber;
            console.log(`User ${userId} joined room ${roomNumber} as ${playerName}`);
            callback({status: "success"});
            console.log(`Sending player list as ${JSON.stringify(Object.values(room.players))}`);
            io.to(roomNumber).emit("recieve_player_list", Object.values(room.players).map(player => 
                ({name: player.name, 
                score: player.score})
            ));;
        } else {
            callback({status: "error", message: "Room does not exist"});
        }
    });

    socket.on("get_player_list", (roomNumber, callback) => {
        if (rooms[roomNumber]) {
            const room = rooms[roomNumber];
            callback({status: "success", playerList: Object.values(room.players).map(player => ({name: player.name, score: player.score}))});
        } else {
            callback({status: "error", message: "Room does not exist"});
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

    //for when a socket sends a message
    socket.on("send_message", (data) => {
        console.log(data);
        socket.to(data.room).emit("recieve_message", data);
    })

    socket.on("disconnecting", () => {
 
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

    socket.on("get_host_room_number", (callback) => {
        let number = Math.floor(Math.random() * 10000);
        while (rooms[number]) {
            number = Math.floor(Math.random() * 10000);
        }
        callback({roomNumber: number});
        console.log(`Created room: ${number}`)
    })

    socket.on("host_create_room", (roomNumber, callback) => {
        if (rooms[roomNumber]) {
            callback({status: "error"});
        } else {
            rooms[roomNumber] = new Room(roomNumber);
            callback({status: "success"});
            socket.join(roomNumber);
            users[socket.userId].roomNumber = roomNumber;
            users[socket.userId].playerName = "Host";
        }
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