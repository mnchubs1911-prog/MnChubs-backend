import mongoose from 'mongoose';

const MAX_RETRIES = 3;

/**
 * Connect to MongoDB.
 * - Uses readyState caching so serverless re-invocations skip reconnection.
 * - Throws on failure so the caller can return a 503.
 */
const connectDB = async () => {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    // Wait for connecting state to resolve
    await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    return;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
      return;
    } catch (err) {
      console.error(`❌ MongoDB attempt ${attempt}/${MAX_RETRIES}: ${err.message}`);
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
};

mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB disconnected'));
mongoose.connection.on('error', (err) => console.error(`❌ MongoDB error: ${err.message}`));

export default connectDB;
