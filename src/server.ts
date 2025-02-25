import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(express.json());

const allowedOrigins: string[] = [
  process.env.CLIENT_URL || '',
  'http://localhost:4200'
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

io.use((socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    console.log(`[Socket Handshake] Client ID: ${socket.id} | Auth Present: ${!!token}`);
    next();
  } catch (err) {
    console.error('[Socket Handshake Error]:', err);
    next(new Error('Internal socket authentication error'));
  }
});

io.on('connection', (socket: Socket) => {
  console.log(`⚡ [Socket Connected] ID: ${socket.id}`);

  socket.on('join_user_room', (userId: string) => {
    if (userId) {
      socket.join(userId);
      console.log(`👤 Socket ${socket.id} joined room: ${userId}`);
    }
  });

  socket.on('disconnect', (reason: string) => {
    console.log(`⚠️ [Socket Disconnected] ID: ${socket.id} | Reason: ${reason}`);
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'pulsepay-backend',
    timestamp: new Date().toISOString() 
  });
});

// Reads directly from process.env.PORT set in your .env or Dockerfile
const PORT = process.env.PORT || 5000; 
const MONGO_URI = process.env.MONGO_URI || '';

async function startServer() {
  try {
    if (MONGO_URI) {
      await mongoose.connect(MONGO_URI);
      console.log('🍃 MongoDB connected successfully.');
    } else {
      console.warn('⚠️ MONGO_URI is missing in environment variables!');
    }

    httpServer.listen(PORT, () => {
      console.log(`🚀 PulsePay Backend listening on port ${PORT}`);
      console.log(`🌐 Allowed CORS origins:`, allowedOrigins);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();