import cors from 'cors';
import express from 'express';
import request from 'supertest';

import { createCorsOptions } from '../src/config/cors.js';

const createTestApp = () => {
  const app = express();
  app.use(
    cors(createCorsOptions(['https://app.greendesk.example', 'https://admin.greendesk.example'])),
  );
  app.get('/resource', (_request, response) => response.json({ success: true }));
  return app;
};

describe('CORS origin allowlist', () => {
  it.each(['https://app.greendesk.example', 'https://admin.greendesk.example'])(
    'allows the configured origin %s',
    async (origin) => {
      const response = await request(createTestApp()).get('/resource').set('Origin', origin);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers.vary).toContain('Origin');
      expect(response.headers).not.toHaveProperty('access-control-allow-credentials');
    },
  );

  it('does not grant CORS access to an unlisted origin', async () => {
    const response = await request(createTestApp())
      .get('/resource')
      .set('Origin', 'https://attacker.example');

    expect(response.status).toBe(200);
    expect(response.headers).not.toHaveProperty('access-control-allow-origin');
    expect(response.headers).not.toHaveProperty('access-control-allow-credentials');
  });

  it('answers an allowed preflight without enabling credentials', async () => {
    const response = await request(createTestApp())
      .options('/resource')
      .set('Origin', 'https://app.greendesk.example')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Authorization');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://app.greendesk.example');
    expect(response.headers['access-control-allow-headers']).toBe('Authorization');
    expect(response.headers).not.toHaveProperty('access-control-allow-credentials');
  });
});
