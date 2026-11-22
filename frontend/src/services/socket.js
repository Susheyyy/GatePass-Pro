import { io } from 'socket.io-client';
import { isDemoSession } from './demo.js';
import { socketOrigin } from './apiConfig.js';

let socket = null;
let currentRoomInfo = null;

const SOCKET_URL = socketOrigin;

export const connectSocket = (role, flatNo) => {
  if (isDemoSession()) {
    disconnectSocket();
    return null;
  }
  const token = sessionStorage.getItem('gatepass_token');
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
  socket.on('disconnect', reason => {
    if (reason === 'io server disconnect') {
      sessionStorage.removeItem('gatepass_token');
      sessionStorage.removeItem('gatepass_user');
      window.dispatchEvent(new Event('gatepass_session_expired'));
    }
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
