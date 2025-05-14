import React, {useState, useEffect} from 'react';
import { Link, useNavigate } from "react-router-dom";


function Lobby() {
    return (
    <>
    <h1>This is a lobby</h1>
    
    </>
    )
}

export default Lobby;

export function ClientRoom() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    
    useEffect(()=> {
        const savedName = localStorage.getItem('playerName');
        const joined = localStorage.getItem('hasJoined') === 'true';
        if (savedName && joined) {
            setUsername(savedName);
            setHasJoined(true);
        }
    }, [])

    const handleEnterLobby = () => {
        if (username.trim() !== '') {
            setHasJoined(true);
            localStorage.setItem('playerName', username);
            localStorage.setItem('hasJoined', hasJoined);
            console.log(`storing locally playerName: ${username}, and hasJoined: ${hasJoined}`)
            
        } else {
            alert('Please enter a valid name.');
        }
    }

    const handleLeaveLobby = () => {
        navigate('/join')
    }


    if (hasJoined) {
        return (<>
            <div>
                <h1>Welcome to the waiting room, {username}</h1>
                <p>we are still waiting for others...</p>
                <button onClick={handleLeaveLobby}>Leave Lobby</button>
            </div>
            </>
        )
    }

    return (<>
    <div>
        <input type='text' placeholder='Enter your gamertag...' onChange={(e) => setUsername(e.target.value)}/>
        <button onClick={handleEnterLobby}>Enter Lobby</button>
    </div>
    
    </>)
}

