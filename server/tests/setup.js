/**
 * Test bootstrap: isolated MongoDB (in-memory by default, or MONGODB_TEST_URI),
 * seeded with a small deterministic dataset so KPI assertions are exact.
 */
import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-must-be-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-must-be-at-least-32-chars-long';
process.env.JWT_ACCESS_TTL ||= '15m';
process.env.MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:1/placeholder';

let memoryServer;

beforeAll(async () => {
  if (!process.env.MONGODB_TEST_URI) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = memoryServer.getUri('analytics_test');
  }
  const { connectDB } = await import('../src/config/db.js');
  await connectDB(process.env.MONGODB_URI);
  await mongoose.connection.db.dropDatabase();
}, 120_000);

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
});
