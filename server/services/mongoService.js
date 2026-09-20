import mongoose from 'mongoose';
import { env } from '../config/env.js';

let connectionPromise = null;

export function connectMongo() {
  if (!env.mongoUri) {
    console.warn('[mongoService] MONGO_URI not set — skipping connection.');
    return Promise.resolve(null);
  }
  if (connectionPromise) return connectionPromise;

  mongoose.set('strictQuery', true);

  connectionPromise = mongoose
    .connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })
    .then((conn) => {
      console.log('[mongoService] Connected to MongoDB Atlas.');
      return conn;
    })
    .catch((err) => {
      connectionPromise = null;
      console.error('[mongoService] Connection failed:', err.message);
      throw err;
    });

  return connectionPromise;
}

export function getMongoStatus() {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return stateMap[mongoose.connection.readyState] ?? 'unknown';
}

/**
 * Cosine similarity fallback used when Atlas Vector Search ($vectorSearch)
 * is unavailable (e.g. free-tier index not yet created). Keeps RAG chat
 * functional without hard-depending on an Atlas Search index at build time.
 */
export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
