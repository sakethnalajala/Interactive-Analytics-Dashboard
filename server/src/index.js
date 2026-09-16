import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { app } from './app.js';

async function start() {
  await connectDB();
  console.log(`✔ MongoDB connected`);
  const server = app.listen(env.PORT, () => {
    console.log(`✔ API listening on http://localhost:${env.PORT}/api  (${env.NODE_ENV})`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
