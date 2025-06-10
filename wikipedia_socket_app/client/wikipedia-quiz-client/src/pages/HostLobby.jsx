import React, {useState, useEffect, useContext, useRef} from 'react';
import { Link , useNavigate} from "react-router-dom";
import { SocketContext } from '../context/SocketContext.jsx';



function HostLobby() {
    const socket = useContext(SocketContext);
    const [roomSetup, setRoomSetup] = useState(false);
    const [roomNumber, setRoomNumber] = useState("");
    const roomCreationAttemptedRef = useRef(false);
 

    useEffect(() => {
        if (!roomCreationAttemptedRef.current) {
            socket.emit("host_create_room", (response) => {
                if (response.status === "success") {
                    setRoomNumber(response.roomNumber);
                    localStorage.setItem("roomNumber", response.roomNumber);
                    console.log(`Host room created with number: ${response.roomNumber}`);
                    roomCreationAttemptedRef.current = true;
                } else {
                    console.log(`Failed to create host room: ${response.message}`);
                }
            });
        }
    } ,[]);

    const onTimerFinish = () => {
        setRoomSetup(true);
    }

    if (!roomSetup) {
        return (<> 
            <HostWaitRoomLoadingScreen initialSeconds={3} onTimerFinish={onTimerFinish}/>
        </>);
    } else {
        return (<>
            <HostWaitingRoom/>
        </>);
    }

}

function HostWaitRoomLoadingScreen({initialSeconds, onTimerFinish}) {
    const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

    useEffect(() => {
        //this causes the number to never actually reach 0, because
        // if it does the value on screen can flash as negative which 
        //appears odd
        if (secondsRemaining <= 0.1) {
            onTimerFinish();
            return;
        }
        const timer = setInterval(() => {
            setSecondsRemaining(prev => prev - 0.1);
        }, 100);

        return () => clearInterval(timer);
    }, [secondsRemaining]);

    const formatTime = (seconds) => {
        return (`${seconds.toFixed(2)} seconds remaining`);
    }

    return (<>
        <div>
            <h1>Creating Room...</h1>
            <h1>{formatTime(secondsRemaining)}</h1>
        </div>
    </>)
}

function HostWaitingRoom(){
    const socket = useContext(SocketContext);
    const navigate = useNavigate();
    const [roomNumber, setRoomNumber] = useState("");
    const [playerList, setPlayerList] = useState([]);
    const [errorStatus, setErrorStatus] = useState("");
    const [showOptions, setShowOptions] = useState(false);
    const [readyToStart, setReadyToStart] = useState(false);
    const roomCreationAttemptedRef = useRef(false);

    //ensure the host is connected to the room
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


    //set up listeners for the host socket
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

    //handle a voluntary quit from the host
    const handleQuit = () => {
        localStorage.removeItem("roomNumber");
        //add a signal to the server that the host is quitting
        navigate("/");
    }

    const unreadyLobby = () => {
        setReadyToStart(false);
    }

    const handleStartGame = () => {

    }

    return (<>
        {showOptions ? (
            <>
            <div>
                <HostWaitingRoomOptions socket={socket} roomNumber={roomNumber} unreadyLobby={unreadyLobby}/>
                <button onClick={() => setShowOptions(false)}>Close Options</button>
            </div>
                </>) : 
        <>
        <button onClick={() => setShowOptions(true)}>Options</button>
        </>}
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
        {readyToStart ? (<button>Start Game</button>) : (null)}
    </>);
}

function HostWaitingRoomOptions({roomNumber, socket, unreadyLobby}){
    const [wikiPageTitle, setWikiPageTitle] = useState("");
    const [wikiPageCount, setWikiPageCount] = useState(0);
    const [wikiPageAddStatus, setWikiPageAddStatus] = useState("");

    useEffect(() => {
        const storedCount = localStorage.getItem("wikiPageCount");
        if (storedCount) {
            setWikiPageCount(parseInt(storedCount));
        }


    }); 

    useEffect(() => {

        const handleReceiveQuestion = (response) => {
            console.log(`sentence: ${response.sentence}, keywords: ${response.keywords}, correctAnswer: ${response.correctAnswer}`);
        }

        socket.on("receive_question", handleReceiveQuestion);

    });

    const handleUrlSubmit = () => {
        if (wikiPageTitle.trim() === "") {
            console.error("URL cannot be empty");
            unreadyLobby();
            return;
        }

        socket.emit("add_url", roomNumber, wikiPageTitle, (response) => {
            if (response.status === "success") {
                console.log(`Added url: ${wikiPageTitle}`);
                let count = wikiPageCount;
                setWikiPageCount(prevCount => prevCount + 1);
                setWikiPageTitle("");
                setWikiPageAddStatus(`Successfully added page: ${wikiPageTitle}`);
                localStorage.setItem("wikiPageCount", count + 1);
            } else {
                console.error(`Failed to add url: ${response.message}`);
                setWikiPageAddStatus(`${response.message}`);
            }
        });
    }

    const handleUrlClear = () => {
        socket.emit("clear_urls", roomNumber, (response) => {
            if (response.status === "success") {
                console.log("Cleared urls successfully");
                setWikiPageTitle("");
                setWikiPageCount(0);
            } else {
                console.error(`Failed to clear urls: ${response.message}`);
            }
        });
    }

    const handleGetQuestion = () => {
        console.log("getQuestion clicked")
        socket.emit("get_question", roomNumber, "Germany", (response) => {
            if (response.status === "failure") {
                console.error(response.message);
            }
        });
    }
    return (
    <>
        <div>
            <p>Urls:</p>
            <input type="text" placeholder='Enter wikipedia url' onChange={(event) => setWikiPageTitle(event.target.value)}/>
            <button onClick={handleUrlSubmit}>Submit</button>
            <button onClick={handleUrlClear}>Clear</button>
        </div>

        <div>
            <p>Timer: </p>
            <input type="number" placeholder='Enter timer in seconds'/>
        </div>
        <div>
            <button onClick={handleGetQuestion}>Get Question</button>
        </div>
    </>)
}


export default HostLobby;