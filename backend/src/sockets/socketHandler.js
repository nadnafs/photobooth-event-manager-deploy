let ioInstance = null;

const init = (io) => {
  ioInstance = io;
  io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};

const getIo = () => ioInstance;

module.exports = {
  init,
  getIo,
};
