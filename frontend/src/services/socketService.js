import { io } from 'socket.io-client';
import env from '../config/env';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(env.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    console.log('Socket client initialized on:', env.socketUrl);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket client disconnected');
  }
};
