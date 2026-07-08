// Environment variables are loaded by Node via --env-file=.env flag in package.json scripts
// This ensures all env vars are available before any ES module code runs

import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import { initializeSocket } from './sockets/chat.socket.js';
import { setIoInstance } from './services/notification.service.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Database
connectDB();

// Create HTTP Server
const server = http.createServer(app);

// Attach Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.endsWith('.vercel.app') ||
        origin === 'http://localhost:3000' ||
        origin === 'http://localhost:5173' ||
        origin === process.env.FRONTEND_URL ||
        origin === process.env.CLIENT_URL
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Socket.io CORS: ${origin} not allowed`));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Set socket instance inside services
setIoInstance(io);

// Initialize Socket Handlers
initializeSocket(io);

// Start Server
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
