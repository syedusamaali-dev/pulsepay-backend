import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import transferRoutes from './routes/transfer.routes';
import transactionRoutes from './routes/transaction.routes';

dotenv.config();

const app = express();

// Fallback to 3000 to align with Docker EXPOSE 3000 and the container health checker
const PORT = 3000;
const HOST = '0.0.0.0'; 

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/transaction', transactionRoutes);

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

  socket.on('join_user_room', (userId: string) => {
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
  server.listen(Number(PORT), HOST, () => {
    console.log(`🚀 PulsePay Backend running on http://${HOST}:${PORT}`);
  });
};

startServer();