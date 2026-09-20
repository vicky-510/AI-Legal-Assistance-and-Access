import { Router } from 'express';
import { getMongoStatus } from '../services/mongoService.js';
import { env } from '../config/env.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    mongo: getMongoStatus(),
    modelsConfigured: Boolean(env.geminiApiKey),
    environment: env.nodeEnv,
  });
});

export default router;
