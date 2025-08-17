import React, {useState, useEffect, useContext, useRef} from 'react';
import { Link , useNavigate} from "react-router-dom";
import { SocketContext } from '../context/SocketContext.jsx';



function HostLobby() {
    const socket = useContext(SocketContext);
    const [roomSetup, setRoomSetup] = useState(false);
    const [isWaiting, setIsWaiting] = useState(true);
    const [roomNumber, setRoomNumber] = useState("");
    const [gameOptions, setGameOptions] = useState({});
    const roomCreationAttemptedRef = useRef(false);
 

    useEffect(() => {
        const waitingRoom = localStorage.getItem("isWaiting");
        if (waitingRoom === "false") {
            setIsWaiting(false);
        }
    }, []);

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

    useEffect(() => {
        const handleRecieveGameStart = () => {
            setIsWaiting(false);
            localStorage.setItem("isWaiting", "false");

            socket.emit("get_question", roomNumber, (response) => {
                if (response.status === "failure") {
                    console.log("unable to get question");
                } else {
                    console.log("starting game");    
                }
            });
        } 

        socket.on("recieve_game_start", )
    })

    const onTimerFinish = () => {
        setRoomSetup(true);
    }

    //we split the end waiting and start game so that all connected pages will transition at the same time
    const handleEndWaitingRoom = () => {
        socket.emit("start_game", roomNumber);
    }

    if (isWaiting) {
        if (!roomSetup) {
            return (<> 
                <HostWaitRoomLoadingScreen initialSeconds={3} onTimerFinish={onTimerFinish}/>
            </>);
        } else {
            return (<>
                <HostWaitingRoom startGame={handleEndWaitingRoom}/>
            </>);
        }
    } else {
        return (<>
            <HostGameRoom  gameOptions={gameOptions}/>
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

function HostWaitingRoom( {startGame} ){
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

    const readyLobby = () => {
        setReadyToStart(true);
    }

    const handleStartGame = () => {
        startGame();
    }

    return (<>
        {showOptions ? (
            <>
            <div>
                <HostWaitingRoomOptions socket={socket} roomNumber={roomNumber} unreadyLobby={unreadyLobby} readyLobby={readyLobby}/>
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
        {readyToStart ? (<button onClick={handleStartGame}>Start Game</button>) : (null)}
    </>);
}

function HostWaitingRoomOptions({roomNumber, socket, unreadyLobby, readyLobby}){
    const [wikiPageTitle, setWikiPageTitle] = useState("");
    const [wikiPageCount, setWikiPageCount] = useState(0);
    const [wikiPageAddStatus, setWikiPageAddStatus] = useState("");

    useEffect(() => {
        const storedCount = localStorage.getItem("wikiPageCount");
        if (storedCount) {
            setWikiPageCount(parseInt(storedCount));
        }


    }); 



    const handleUrlSubmit = () => {
        if (wikiPageTitle.trim() === "") {
            console.error("URL cannot be empty");
            unreadyLobby();
            return;
        }

        unreadyLobby();

        socket.emit("add_url", roomNumber, wikiPageTitle, (response) => {
            if (response.status === "success") {
                console.log(`Added url: ${wikiPageTitle}`);
                let count = wikiPageCount;
                setWikiPageCount(prevCount => prevCount + 1);
                setWikiPageTitle("");
                setWikiPageAddStatus(`Successfully added page: ${wikiPageTitle}`);
                localStorage.setItem("wikiPageCount", count + 1);
                readyLobby();
            } else {
                console.error(`Failed to add url: ${response.message}`);
                setWikiPageAddStatus(`${response.message}`);
                readyLobby();
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
            <p>{wikiPageAddStatus}</p>
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

function HostGameRoom(gameOptions) {
    const socket = useContext(SocketContext);
    const [pageTitle, setPageTitle] = useState("");
    const [isQuestion, setIsQuestion] = useState(false);
    const [isScores, setIsScores] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [questionData, setQuestionData] = useState(null);
    const [scoreData, setScoreData] = useState(null);
    const [roomNumber, setRoomNumber] = useState("");


    useEffect(() => {
        let storedRoomNumber = localStorage.getItem("roomNumber");
        if (storedRoomNumber) {
            setRoomNumber(storedRoomNumber);
        }
    }, [roomNumber])

    //set up listeners for questions and scores
    useEffect(() => {
        const handleReceiveQuestion = (response) => {
            console.log(`sentence: ${response.sentence}, keywords: ${response.keywords}, correctAnswer: ${response.correctAnswer}`);
            setQuestionData(response);
            setIsQuestion(true);
            setIsScores(false);
        }

        socket.on("receive_question", handleReceiveQuestion);

    });

    const handleEndQuestion = () => {
        setIsQuestion(false);
        setIsScores(true);
    }

    const handleEndScores = () => {

        setIsQuestion(true);
        setIsScores(false);

        socket.emit("get_question", roomNumber, (response) => {
            if (response.status === "failure") {
                console.log("unable to get question");
            } else {
                console.log("recieved question");    
            }
        });
    }

    if (isQuestion) {
        return (<HostGameRoomQuestion questionBatch={questionData} handleEndQuestion={handleEndQuestion}/>);
    } else if (isScores) {
        return (<HostGameRoomScores scoreBatch={null} handleEndScores={handleEndScores}/>);
    } else if (gameOver) {
        return (<>
            <p>Game Over</p>
        </>)
    } else {
    //this return statement should never be reached, and exists as a place to catch mistakes
    return (<>
    <h1>An Error Has Occured</h1>
    <p>The game state is recognized as neither being in a Question state or a Score state, and the game is recognized as ongoing.</p>
    </>);
    }
}

function HostGameRoomQuestion({questionBatch, handleEndQuestion}) {
    const [formattedSentence, setFormattedSentence] = useState("");

    const formatQuestion = (batch) => {
        let returnSentence = batch.sentence.replace("$$$"+batch.correctAnswer+"$$$", "_________");
        returnSentence = returnSentence.replaceAll("$$$", "");
        
        setFormattedSentence(returnSentence);
    }

    useEffect(() => {
        formatQuestion(questionBatch);
    }, [])



    return (<>
    <h1>{formattedSentence}</h1>
    <button onClick={handleEndQuestion}>Close Question</button>
        </>)
}

function HostGameRoomScores({scoreBatch, handleEndScores}) {


    return (<>
    <h1>Scores</h1>
    <button onClick={handleEndScores}>Next Question</button>
    </>)
}


export default HostLobby;