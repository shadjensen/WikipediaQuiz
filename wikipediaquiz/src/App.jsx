import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Link } from "react-router-dom";

function App() {
  const [count, setCount] = useState(0)

  

  return (
    <>

      <h2>Welcome!</h2>
      <div>
        <Link to={"/lobby"}>
          <button>Host</button>
        </Link>
        <Link to={"/join"}>
          <button>Join</button>
        </Link>
      </div>

    </>
  )
}

export default App
