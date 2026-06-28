const express = require('express');
const cors = require('cors');
require('dotenv').config({ override: true });
const connectDB = require('./config/db');
const residentRoutes = require('./routes/residentRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const postRoutes = require('./routes/postRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const helmet = require('helmet');

const http = require('http');
const socketio = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

connectDB();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
  try {
    const decoded = jwt.verify(token, jwtSecret);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  socket.on('join_room', (data) => {
    const role = socket.user.role;
    if (role === 'admin') {
      socket.join('room_admins');
    } else if (role === 'security') {
      socket.join('room_security');
    } else if (role === 'resident' && socket.user.flatNo) {
      const roomName = `room_flat_${socket.user.flatNo.toUpperCase().trim()}`;
      socket.join(roomName);
    }
  });
});

app.use('/api/residents', residentRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: "GatePass Pro Backend API Online" });
});

app.disable('x-powered-by');

app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

server.listen(PORT, () => {
  console.log(`Server running successfully on port ${PORT}`);
});