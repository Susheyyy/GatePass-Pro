const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('node:http');
const socketio = require('socket.io');
const { authenticate } = require('./middleware/authMiddleware');
const { validateConfig } = require('./config/security');

function createApplication() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  const allowedOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const server = http.createServer(app);
  const io = socketio(server, { cors: { origin: allowedOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE'] } });
  app.use(helmet());
  app.use(cors({ origin: allowedOrigin }));
  app.use(express.json({ limit: '200kb' }));
  app.use((req, res, next) => { req.io = io; next(); });
  io.use(async (socket, next) => {
    try { socket.user = await authenticate(socket.handshake.auth.token); next(); }
    catch { next(new Error('Invalid, expired or revoked session')); }
  });
  io.on('connection', socket => {
    socket.on('join_room', () => {
      if (socket.user.role === 'admin') socket.join('room_admins');
      else if (socket.user.role === 'security') socket.join('room_security');
      else socket.join(`room_flat_${socket.user.flatNo}`);
    });
  });
  app.use('/api/residents', require('./routes/residentRoutes'));
  app.use('/api/visitors', require('./routes/visitorRoutes'));
  app.use('/api/posts', require('./routes/postRoutes'));
  app.use('/api/notifications', require('./routes/notificationRoutes'));
  app.get('/api/health', (req, res) => res.json({ status: 'GatePass Pro Backend API Online' }));
  app.use((req, res) => res.status(404).json({ message: 'Resource not found' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.status || 500).json({ message: error.status === 400 ? 'Invalid request body' : 'Request failed' });
  });
  return { app, server, io };
}

async function start() {
  require('dotenv').config();
  validateConfig();
  await require('./config/db')();
  const { server } = createApplication();
  server.listen(process.env.PORT || 5000, () => console.log('GatePass Pro API started'));
}
if (require.main === module) start().catch(async () => { console.error('Startup failed. Check database connectivity and required security configuration.'); await require('mongoose').disconnect(); process.exitCode = 1; });
module.exports = { createApplication };
