import React, {useState, useEffect, useContext} from 'react';
import { Link , useNavigate} from "react-router-dom";
import { SocketContext } from '../context/SocketContext.jsx';
import { ClientRoom } from '../../../../../wikipediaquiz/src/ClientLobby.jsx';


function ClientLobby() {

    const [inGame, setInGame] = useState(false);
    const [roomNumber, setRoomNumber] = useState("");
    

    const onLobbyJoin = (roomNumber) => {
        setInGame(true);
        setRoomNumber(roomNumber);
    }

    if (!inGame) {
        return (<>
            <ClientRoomJoin onLobbyJoin={onLobbyJoin}/>
        </>);
    } else {
        return (<>
            <ClientGameRoom roomNumber={roomNumber}/>
        </>);
    }

}

function ClientRoomJoin({onLobbyJoin}) {
    const socket = useContext(SocketContext);
    const [roomNumber, setRoomNumber] = useState("");
    const [roomJoined, setRoomJoined] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const [username, setUsername] = useState('');


    const navigate = useNavigate();

    useEffect(() => {
        const storedRoomNumber = localStorage.getItem("roomNumber");
        const storedRoomJoined = localStorage.getItem("roomSocketConnected") === 'true';
        const storedPlayerName = localStorage.getItem("playerName");
        const storedHasJoined = localStorage.getItem("hasJoined") === 'true';

        //connection happens in two phases. First you connect to the socket and room,
        //then you join the lobby with a username. The first must take place before the second
        if (storedRoomNumber && storedRoomJoined) {
            setRoomNumber(storedRoomNumber);
            setRoomJoined(storedRoomJoined);

            if (storedPlayerName && storedHasJoined) {
                setUsername(storedPlayerName);
                setHasJoined(storedHasJoined);
            }
        }
    });

    const handleJoin = (inputNumber) => {
        if (inputNumber && !isNaN(inputNumber)) {
            clearLocalStorage();

            socket.emit("join_room", inputNumber, (response) => {
                if (response.status === "success") {
                    console.log(`Successfully joined room: ${inputNumber}`);
                    setRoomJoined(true);
                    localStorage.setItem("roomNumber", inputNumber);
                    localStorage.setItem("roomSocketConnected", true);
                } else {
                    console.log(`Failed to join room: ${inputNumber}`);
                }
            });

        }
    }

    const handleEnterLobby = () => {
        if (username.trim() !== '') {
            socket.emit("player_join_room", roomNumber, username, (response) => {
                if (response.status === "success") {
                    console.log(`Successfully joined lobby as: ${username}`);
                    setHasJoined(true);
                    localStorage.setItem('playerName', username);
                    localStorage.setItem('hasJoined', true);
                    onLobbyJoin(roomNumber);
                } else {
                    console.log(`Failed to join lobby: ${response.message}`);
                }
            });
        }
    }

    const handleRoomLeave = () => {
        socket.emit("leave_room", roomNumber, (response) => {
            if (response.status === "success") {
                console.log(`Sucessfully left room: ${roomNumber}`);
                setRoomJoined(false);
            } else {
                console.log(`Failed to leave room: ${roomNumber}`);
            }
        });
        setRoomJoined(false);
        clearLocalStorage();
        navigate('/');
    }

    /**clears all values used for persistence in the lobby, which will 
     * allow users to rejoin in the instance of a disconnect during a game but will also
     * allow them to start fresh if they load all the way to the main page
     * **/
    
    function clearLocalStorage() {
        localStorage.removeItem("playerName");
        localStorage.removeItem("hasJoined");
        localStorage.removeItem("roomNumber");
        localStorage.removeItem("roomSocketConnected");
        console.log("removed playerName, hasJoined, roomNumber and roomSocketConnected from local storage");
    }

    if (!roomJoined) {
    return (<>
        <h1>This is the join page</h1>
        <input type='number' placeholder='Input Room Number' onChange={(e) => setRoomNumber(e.target.value)}/>
        <button onClick={() => handleJoin(roomNumber)}>Join</button>
        <button onClick={() => navigate('/')}>Back</button>
    </>);
    } else if (!hasJoined){

        return (<>
                <div>
                    <input type='text' placeholder='Enter your gamertag...' onChange={(e) => setUsername(e.target.value)}/>
                    <button onClick={handleEnterLobby}>Enter Lobby</button>
                    <button onClick={handleRoomLeave}>Leave Room</button>
                </div>
            </>);
    } else {
        handleEnterLobby();
    }

}


function ClientGameRoom({roomNumber}){
    const socket = useContext(SocketContext);
    const navigate = useNavigate();

    const [playerList, setPlayerList] = useState([]);

    const handleLeaveRoom = () => {
        socket.emit("leave_room", roomNumber, (response) => {
            if (response.status === "success") {
                console.log(`Sucessfully left room: ${roomNumber}`);
            } else {
                console.log(`Failed to leave room: ${roomNumber}`);
            }
        });
        localStorage.removeItem("playerName");
        localStorage.removeItem("hasJoined");
        localStorage.removeItem("roomNumber");
        localStorage.removeItem("roomSocketConnected");
        console.log("removed playerName, hasJoined, roomNumber and roomSocketConnected from local storage");
        navigate('/');
    }

    socket.on("update_player_list", (players) => {
        setPlayerList(players);
    });


    return (<>
        <h1>Welcome to the game room!</h1>
        <button onClick={handleLeaveRoom}>leave game room</button>
    </>);
}


export default ClientLobby;