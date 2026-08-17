import mongoose from 'mongoose';

// 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
let isConnected = 0;

export const connectDB = async (): Promise<void> => {
  // If already connected, reuse existing connection
  if (isConnected === 1) {
    return;
  }

  try {
    const mongoUri = process.env.MONGO_URI || '';
    if (!mongoUri) {
      throw new Error('MONGO_URI is missing in environment variables');
    }

    const conn = await mongoose.connect(mongoUri);
    isConnected = conn.connections[0].readyState;

    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📁 Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error);
    // Throw error so Express handles it instead of forcibly killing the Node process
    throw error;
  }
};