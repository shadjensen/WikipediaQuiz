import React, { createContext, useContext} from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();



export const SocketContextProvider = ({ children }) => {

    let userId = localStorage.getItem("userId");
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem("userId", userId);
    }

    const socket = io.connect("http://localhost:3001", {
        query: { userId },
    });

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export { SocketContext };

