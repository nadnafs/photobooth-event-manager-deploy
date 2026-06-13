const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const env = require('./src/config/env');
const socketHandler = require('./src/sockets/socketHandler');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.set('io', io);
socketHandler.init(io);

const PORT = env.PORT;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
