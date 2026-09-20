// Vercel serverless entrypoint. Exports the same Express app used locally
// (see index.js's createApp()) as a request handler instead of calling
// app.listen() — Vercel's Node.js runtime invokes it per-request.
//
// Caveats versus a normal long-lived server (e.g. Render), worth knowing:
// - express-rate-limit's in-memory store is per-instance. Vercel can run
//   multiple concurrent instances, so the configured limits are enforced
//   per-instance, not globally — a determined client could exceed the
//   intended global rate by hitting different cold instances.
// - Slow requests (large PDFs, multi-tier Gemini fallback retries) can hit
//   the function's maxDuration (see vercel.json) and get killed mid-request.
// - Cold starts add latency to the first request after idle periods.
import { env, assertCriticalEnv } from '../config/env.js';
import { createApp } from '../index.js';
import { connectMongo } from '../services/mongoService.js';
import { ensureBootstrapAdmin } from '../services/authService.js';

assertCriticalEnv();

const app = createApp();

// Serverless functions are re-invoked in the same warm instance between
// requests, so this cache avoids reconnecting to Mongo / re-running the
// admin bootstrap on every single request — only on cold starts.
let readyPromise = null;
function ensureReady() {
  if (!readyPromise) {
    readyPromise = connectMongo()
      .then(() => ensureBootstrapAdmin())
      .catch((err) => {
        console.error('[api] Startup task failed:', err.message);
        readyPromise = null; // allow retry on the next invocation
      });
  }
  return readyPromise;
}

export default async function handler(req, res) {
  await ensureReady();
  app(req, res);
}
