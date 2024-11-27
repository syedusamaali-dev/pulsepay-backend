import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import transferRoutes from './routes/transfer.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transfer', transferRoutes);

// Create HTTP & Socket.io Server
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

// Socket Connection Channel
io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  socket.on('join_account', (userId: string) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined personal socket room`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'PulsePay Core API is online!' });
});

// Start Server
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 PulsePay Backend running on http://localhost:${PORT}`);
  });
};

startServer();