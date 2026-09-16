import mongoose from 'mongoose';
import { env } from './env.js';

// Connection promise is cached on the module so Vercel serverless invocations reuse it.
let connectPromise = null;

export async function connectDB(uri = env.MONGODB_URI) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectPromise) {
    mongoose.set('strictQuery', true);
    connectPromise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 })
      .then((m) => m.connection)
      .catch((err) => {
        connectPromise = null;
        throw err;
      });
  }
  return connectPromise;
}

export async function disconnectDB() {
  connectPromise = null;
  await mongoose.disconnect();
}
