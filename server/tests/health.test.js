import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../index.js';

describe('GET /health', () => {
  const app = createApp();

  it('returns 200 with system status fields', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(['connected', 'disconnected', 'connecting', 'disconnecting', 'unknown']).toContain(
      res.body.mongo
    );
    expect(typeof res.body.modelsConfigured).toBe('boolean');
  });
});

describe('security headers', () => {
  const app = createApp();

  it('sets helmet security headers on responses', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});

describe('GET /', () => {
  const app = createApp();

  it('returns a friendly API landing response instead of a 404', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('LexiClear AI API');
    expect(res.body.health).toBe('/health');
  });
});

describe('unknown routes', () => {
  const app = createApp();

  it('returns 404 for an unmatched route', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
