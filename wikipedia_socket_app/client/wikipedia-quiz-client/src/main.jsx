import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ClientLobby from './pages/ClientLobby.jsx';
import HostLobby from './pages/HostLobby.jsx';
import  {BrowserRouter, createBrowserRouter, RouterProvider} from 'react-router-dom';
import { SocketContextProvider } from './context/SocketContext.jsx';


const router = createBrowserRouter([
  {path:"/", element: <App/>},
  {path:"/play", element: <ClientLobby/>},
  {path:"/host", element: <HostLobby/>},
]);

createRoot(document.getElementById('root')).render(
  
    <SocketContextProvider>
      <RouterProvider router={router}/>
    </SocketContextProvider>,
  
)
