import { useState, useEffect, useContext } from 'react'
import './App.css'
import io from 'socket.io-client'
import { SocketContext } from './context/SocketContext.jsx';
import { Link } from "react-router-dom";



function App() {
  const socket = useContext(SocketContext);
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [recievedMessage, setRecievedMessage] = useState("");

  const joinRoom = () => {
    if (room !== ""){
      socket.emit("join_room", room);
    }
  }

  const clearLocalStorage = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("playerName");
    localStorage.removeItem("roomNumber");
    localStorage.removeItem("roomSocketConnected");
  }

  const sendMessage = () => { 
    socket.emit("send_message", {message: message, room: room});
  }

  useEffect(() => {
    socket.on("recieve_message", (data) => {
      setRecievedMessage(data.message);
    })
  }, [socket]);

  useEffect(() => {
    clearLocalStorage();
  });




  return (
   <>



    <h2>Welcome!</h2>
    <div>
      <Link to={"/host"}>
        <button>Host</button>
      </Link>
      <Link to={"/play"}>
        <button>Join</button>
      </Link>
    </div>
    <div>
      <button onClick={clearLocalStorage} >Clear Storage</button>
    </div>
   </>
  )
}

export default App
