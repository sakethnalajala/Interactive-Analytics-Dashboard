/**
 * Vercel serverless entry point. Every /api/* request is rewritten here
 * (see vercel.json) and handled by the same Express app used locally.
 * The Mongoose connection is cached across warm invocations in server/src/config/db.js.
 */
import { app } from '../server/src/app.js';

export default app;
