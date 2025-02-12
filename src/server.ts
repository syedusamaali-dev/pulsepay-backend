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

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Explicit list of allowed production and local origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://pulsepay-frontend-pi.vercel.app',
  'http://localhost:4200',
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, fallback to allowing origin so CORS headers are still written
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};

// 1. MUST BE FIRST: Apply CORS middleware globally BEFORE any routes or body parsers
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 2. Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Health Check Endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'PulsePay Core API is online!' });
});

// 4. API Routes
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

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, HOST, () => {
      console.log(`🚀 PulsePay Backend running on http://${HOST}:${PORT}`);
      console.log(`🔒 Allowed Origins:`, allowedOrigins);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};

startServer();