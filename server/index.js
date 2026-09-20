import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, assertCriticalEnv } from './config/env.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { connectMongo } from './services/mongoService.js';
import { ensureBootstrapAdmin } from './services/authService.js';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
  const app = express();

  app.use(securityHeaders);
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(apiLimiter);

  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function start() {
  assertCriticalEnv();

  try {
    await connectMongo();
    await ensureBootstrapAdmin();
  } catch (err) {
    console.error('[startup] Continuing without a healthy MongoDB connection:', err.message);
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[server] LexiClear AI backend listening on port ${env.port}`);
  });
}

// Only auto-start when run directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  start();
}
