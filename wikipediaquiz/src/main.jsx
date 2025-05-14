
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import  {BrowserRouter, createBrowserRouter, RouterProvider} from 'react-router-dom';
import Join from './Join.jsx';
import Lobby, { ClientRoom } from './ClientLobby.jsx';


const router = createBrowserRouter([
  {path:"/", element: <App/>},
  {path:"/join", element: <Join/>},
  {path:"/lobby", element: <Lobby/>},
  {path:"/lobby/:roomid", element:<ClientRoom/>}
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>
)
