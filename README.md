# WikipediaQuiz

This is a project intended to be similar to online quiz games like [Kahoot] but rather than allowing users to generate questions the questions are scraped from Wikipedia articles.

To start up the project, two the server and the client both need to be started. The server is for handling socket communication, while the client is the web pages that both the player and the host will see and experience the game through. In order to do this, two terminals need to be running simultaneously, which can be done in VS Code by opening a terminal on the bottom of the screen (if this is not visible find View in the top bar and then navigate to Terminal), and then pressing the "+" button on the top right of the terminal popup. This should open a second terminal from which these two lines of commands can be run.

To start the server navigate to .\wikipedia_socket_app\server and then run the server with the commands:

cd .\wikipedia_socket_app\server
npm run start

You can know that this process worked successfully if some messages appear that look something like
[nodemon] 3.1.10
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,cjs,json
[nodemon] starting `node index.js`
Server running on port 3001


To start the client navigate to .\wikipedia_socket_app\client\wikipedia-quiz-client and run the client with:

cd .\wikipedia_socket_app\client\wikipedia-quiz-client
npm run dev

Usually when this completes successfully you'll find
> wikipedia-quiz-client@0.0.0 dev
> vite


  VITE v6.3.5  ready in 1003 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help



To play the game, both processes should be running if the commands above have been executed. You can visit the website using the link listed which should be http://localhost:5173/. If a different port number appears follow that instead. If you are trying to join from a device that is not the one running the client and server, you will need to replace "localhost" with the IP Address of the computer that is hosting. This can be found by running the command
ipconfig
in a terminal. Find the entry listed as IPv4 and substitute that for the localhost. It might look something like
http://192.168.1.147:5173/
Note: This connection will only work if both the connecting device and the device hosting these processes are on the same network. If a phone using data tries to connect to a laptop on wifi, this will not work. Both devices need to be on the same wifi for a connection like this to be possible. 

