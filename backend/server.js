const express = require('express');
const cors = require('cors');
require('dotenv').config({ override: true });
const connectDB = require('./config/db');
const residentRoutes = require('./routes/residentRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const postRoutes = require('./routes/postRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const http = require('http');
const socketio = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

connectDB();

app.use(cors());
app.use(express.json()); 

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', (data) => {
    const { role, flatNo } = data;
    if (role === 'admin') {
      socket.join('room_admins');
      console.log(`Socket ${socket.id} joined room_admins`);
    } else if (role === 'security') {
      socket.join('room_security');
      console.log(`Socket ${socket.id} joined room_security`);
    } else if (role === 'resident' && flatNo) {
      const roomName = `room_flat_${flatNo.toUpperCase().trim()}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined ${roomName}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.use('/api/residents', residentRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: "GatePass Pro Backend API Online" });
});

server.listen(PORT, () => {
  console.log(`Server running successfully on port ${PORT}`);
});