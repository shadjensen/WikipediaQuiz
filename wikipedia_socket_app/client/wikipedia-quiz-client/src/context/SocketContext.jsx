import React, { createContext, useContext} from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {

    let userId = localStorage.getItem("userId");
    if (!userId) {

        //only call crypto if it is recognized by the browser as a function
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            //generate a user id using the crypto call 
            userId = crypto.randomUUID();
        } else {
            //if the crypto call isn't supported by the browser generate an id using the uuid library
            userId = uuidv4();
        }
        
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

