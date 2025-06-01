import React, {useState, useEffect, useContext} from 'react';
import { Link , useNavigate} from "react-router-dom";
import { SocketContext } from '../context/SocketContext.jsx';

function HostLobby() {
    return (<> 
        <HostWaitingRoom/>
    </>);
}

function HostWaitingRoom(){
    const socket = useContext(SocketContext);
    const navigate = useNavigate();
    const [roomNumber, setRoomNumber] = useState("");
    const [playerList, setPlayerList] = useState([]);
    const [roomConnected, setRoomConnected] = useState(false);

    useEffect(() => {
        const storedRoomNumber = localStorage.getItem("roomNumber");
        if (storedRoomNumber) {
            setRoomNumber(storedRoomNumber);
        } else {
            socket.emit("get_host_room_number", (response) => {
                setRoomNumber(response.roomNumber);
                localStorage.setItem("roomNumber", response.roomNumber);
            })
        }
    }, []);

    useEffect(() => {    
        socket.emit("host_create_room", roomNumber, (response) => {
            if (response.status === "error") {
                console.log("Room already exists");
            } else {
                console.log("Room create successfully");
            }
        });
    }, [roomNumber, socket]);

    


    useEffect(() => {
        const handleRecievePlayerList = (players) => {
            let playerMap = players.map(player => ({name: player.name, score: player.score}));
            console.log(`Recieved player list: ${JSON.stringify(players)}`);
            setPlayerList(playerMap);
        }

        console.log(`Setting up receieve_player_list for room: ${roomNumber}`)
        socket.on("recieve_player_list", handleRecievePlayerList);


        return () => {
            console.log(`Cleaning up receieve_player_list for room: ${roomNumber}`);
            socket.off("recieve_player_list", handleRecievePlayerList);
        }
        
    }, [socket, roomNumber]);

        


    const handleQuit = () => {
        localStorage.removeItem("roomNumber");
        navigate("/");
    }



    return (<>
        <h1>Host Lobby</h1>
        <p>Room Number: {roomNumber}</p>
        <button onClick={handleQuit}>Stop Hosting</button>
        <p>Current Players</p>
        <ul>
            {playerList.map((player, index) => (
                <li key={index}>{player.name}</li>
            ))}
        </ul>
    </>);
}

export default HostLobby;