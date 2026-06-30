import { io } from 'socket.io-client';

let socket = null;
let currentRoomInfo = null;

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.split('/api')[0]
  : 'http://localhost:5000';

export const connectSocket = (role, flatNo) => {
  const token = localStorage.getItem('gatepass_token');
  const roomKey = `${role}_${flatNo || ''}`;

  if (socket && currentRoomInfo === roomKey && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  currentRoomInfo = roomKey;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    auth: {
      token
    }
  });

  socket.on('connect', () => {
    socket.emit('join_room', { role, flatNo });
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
    currentRoomInfo = null;
  }
};
