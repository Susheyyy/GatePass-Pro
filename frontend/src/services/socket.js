import { io } from 'socket.io-client';

let socket = null;

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.split('/api')[0]
  : 'http://localhost:5000';

export const connectSocket = (role, flatNo) => {
  if (socket) {
    socket.disconnect();
  }

  const token = localStorage.getItem('gatepass_token');

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    auth: {
      token
    }
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully:', socket.id);
    socket.emit('join_room', { role, flatNo });
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
