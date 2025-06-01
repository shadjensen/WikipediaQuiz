import React, {useState, useEffect, useContext} from 'react';
import { Link , useNavigate} from "react-router-dom";
import { SocketContext } from '../context/SocketContext.jsx';


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
    const [username, setUsername] = useState('');
    const [errorStatus, setErrorStatus] = useState("");


    const navigate = useNavigate();

    useEffect(() => {
        const storedRoomNumber = localStorage.getItem("roomNumber");
        const storedRoomJoined = localStorage.getItem("roomSocketConnected") === 'true';
        const storedPlayerName = localStorage.getItem("playerName");

        if (storedRoomNumber && storedRoomJoined && storedPlayerName) {
            setRoomNumber(storedRoomNumber);
            setRoomJoined(storedRoomJoined);
            setUsername(storedPlayerName);

            handleRejoin();
        }
    }, []);

    useEffect(() => {
        const storedRoomNumber = localStorage.getItem("roomNumber");
        const storedRoomJoined = localStorage.getItem("roomSocketConnected") === 'true';
        const storedPlayerName = localStorage.getItem("playerName");

        if (storedRoomNumber && storedRoomJoined && storedPlayerName) {
            console.log(`Rejoining room: ${storedRoomNumber} as ${storedPlayerName}`);

            handleRejoin();
        }

    }, [roomJoined, roomNumber, username]);

    const handleJoin = (inputNumber) => {
        if (inputNumber === '' || isNaN(inputNumber)) {
            setErrorStatus("Please enter a valid room number");
            return;
        } else if(username.trim() === '') {
            setErrorStatus("Please enter a valid gamertag");
            return;
        } else {
            //if there is a valid username and room number, attempt to join room
            clearLocalStorage();

            socket.emit("player_join_room", inputNumber, username, (response) => {
                if (response.status === "success") {
                    console.log(`successfully joined room: ${inputNumber}`);
                    setRoomJoined(true);
                    localStorage.setItem("roomNumber", inputNumber);
                    localStorage.setItem("roomSocketConnected", true);
                    localStorage.setItem("playerName", username);
                } else {
                    console.log(`Failed to join room: ${inputNumber}`);
                    setErrorStatus(response.message);
                }
            });

        }
    }

    const handleRejoin = () => {
        console.log(`Attempting to rejoin room: ${roomNumber} as ${username}`);
        if (username.trim() !== '') {
            socket.emit("player_join_room", roomNumber, username, (response) => {
                if (response.status === "success") {
                    console.log(`Successfully joined lobby as: ${username}`);
                    setRoomJoined(true);
                    localStorage.setItem('playerName', username);
                    onLobbyJoin(roomNumber);

                } else {
                    //if failed to rejoin, redirect player to empty join page
                    console.log(`Failed to join lobby: ${response.message}`);
                    clearLocalStorage();
                    setRoomNumber("");
                    setErrorStatus("Failed to rejoin room. Please try again.");
                    setRoomJoined(false);
                    setUsername('');
                }
            });
        }
    }

    const handleRoomLeave = () => {
        socket.emit("leave_room", roomNumber, username, (response) => {
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
        localStorage.removeItem("roomNumber");
        localStorage.removeItem("roomSocketConnected");
        console.log("removed playerName, roomNumber and roomSocketConnected from local storage");
    }

    return (<>
        <h1>This is the join page</h1>
        <input type='number' placeholder='Input Room Number' onChange={(e) => setRoomNumber(e.target.value)}/>
        <div>
            <input type='text' placeholder='Enter your gamertag...' onChange={(e) => setUsername(e.target.value)}/>
            <button onClick={() => handleJoin(roomNumber)}>Enter Lobby</button>
            <button onClick={() => handleRoomLeave}>Leave Room</button>
        </div>
        <div className="error-status">
            <p>{errorStatus}</p>
        </div>
        <button onClick={() => navigate('/')}>Back</button>
    </>);


}


function ClientGameRoom({roomNumber}){
    const socket = useContext(SocketContext);
    const navigate = useNavigate();
    const playerName = localStorage.getItem("playerName");
    const [playerList, setPlayerList] = useState([]);



    socket.on("recieve_player_list", (players) => {
        let playerNames = players.map(player => player.name);
        console.log(`Recieved player list: ${JSON.stringify(players)}`);

        setPlayerList(playerNames);
    });

    const handleLeaveRoom = () => {
        socket.emit("leave_room", roomNumber,  playerName, (response) => {
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

    useEffect(() => {
        
        socket.emit("get_player_list", roomNumber);
    }, []);



    
    return (<>
        <h1>Welcome to the game room!</h1>
        <button onClick={handleLeaveRoom}>leave game room</button>

        <p>Current Players</p>
        <ul>
            {playerList.map((player, index) => (
                <li key={index}>{player}</li>
            ))}
        </ul>
    </>);
}


export default ClientLobby;