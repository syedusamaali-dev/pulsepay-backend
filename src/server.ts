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

// Back4App assigns PORT dynamically in production. Fallback to 3000 for local dev.
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Ensure CORS allows your Vercel URL, localhost, or environment variable
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';
const allowedOrigins = [
  CLIENT_URL,
  'https://pulsepay-frontend-pi.vercel.app',
  'http://localhost:4200'
];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/transaction', transactionRoutes);

// Create HTTP & Socket.io Server
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
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
  server.listen(PORT, HOST, () => {
    console.log(`🚀 PulsePay Backend running on http://${HOST}:${PORT}`);
  });
};

startServer();