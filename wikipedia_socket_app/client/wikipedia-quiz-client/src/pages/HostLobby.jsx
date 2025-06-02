import React, {useState, useEffect, useContext, useRef} from 'react';
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
    const [errorStatus, setErrorStatus] = useState("");
    const roomCreationAttemptedRef = useRef(false);

    useEffect(() => {
        const storedRoomNumber = localStorage.getItem("roomNumber");
        if (storedRoomNumber) {
            setRoomNumber(storedRoomNumber);

            socket.emit("player_join_room", storedRoomNumber, "host", (response) => {
                if (response.status === "success") {
                    console.log("Host rejoined room successfully");

                    socket.emit("request_player_list", storedRoomNumber, (listResponse) => {
                        if (listResponse.status === "success") {
                            console.log("recieved player list:", listResponse.players);
                        } else {
                            console.error(`Failed to get player list: ${listResponse.message}`);
                            setErrorStatus(listResponse.message);
                        }
                    });
                } else {
                    console.error(`Failed to rejoin host room: ${response.message}`);
                    setErrorStatus(response.message);
                    localStorage.removeItem("roomNumber");
                    roomCreationAttemptedRef.current = false;
                }
            });
        //if there is no room number, create a new room    
        } else {
            if (!roomCreationAttemptedRef.current) {
                roomCreationAttemptedRef.current = true;
                socket.emit("host_create_room", (response) => {
                if (response.status === "success"){
                    setRoomNumber(response.roomNumber);
                    localStorage.setItem("roomNumber", response.roomNumber);

                    console.log(`Host room created with number: ${response.roomNumber}`);
                    socket.emit("request_player_list", response.roomNumber, (listResponse) => {
                        if (listResponse.status === "success") {
                            console.log("Recieved player list:", listResponse.players);
                            setPlayerList(listResponse.players);
                        } else {
                            console.error(`Failed to get player list: ${listResponse.message}`);
                            setErrorStatus(listResponse.message);
                        }
                    });

                } else {
                    console.error(`Failed to create host room: {response.message}`);
                    setErrorStatus(response.message);
                    roomCreationAttemptedRef.current = false;
                }


            });
                
            } else {
                setErrorStatus("Room creation attempt was true, but no room number was found");
            }

        
        }
    }, [socket]);



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
        //add a signal to the server that the host is quitting
        navigate("/");
    }



    return (<>
        <h1>{errorStatus}</h1>
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