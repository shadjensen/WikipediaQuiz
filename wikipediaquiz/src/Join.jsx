import React, {useState, useEffect} from 'react';
import { Link , useNavigate} from "react-router-dom";


function Join() {
    const [roomNumber, setRoomNumber] = useState(null);



    const navigate = useNavigate('\join');

    const handleJoin = (inputNumber) => {
        if (inputNumber && !isNaN(inputNumber)) {
            clearLocalStorage();
            navigate(`/lobby/${inputNumber}`)
        }
    }

    /**clears all values used for persistence in the lobby, which will 
     * allow users to rejoin in the instance of a disconnect during a game but will also
     * allow them to start fresh if they load all the way to the main page
     * **/
    
    function clearLocalStorage() {
        localStorage.removeItem("playerName");
        localStorage.removeItem("hasJoined");
        console.log("removing playerName and hasJoined from local storage")
    }

    return (<>
    <h1>This is the join page</h1>
    <input type='number' placeholder='Input Room Number' onChange={(e) => setRoomNumber(e.target.value)}/>
    <button onClick={() => handleJoin(roomNumber)}>Join</button>
    <button onClick={() => navigate('/')}>Back</button>
    </>)
}


export default Join;