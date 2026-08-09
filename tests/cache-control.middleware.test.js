import express from 'express';
import request from 'supertest';

import { cacheControlPolicies } from '../src/config/cache.js';
import { createCacheControlMiddleware } from '../src/core/middlewares/cache-control.middleware.js';

const createTestApp = (environment) => {
  const app = express();
  app.use(createCacheControlMiddleware(environment));
  app.all('*path', (request, response) => response.json({ path: request.path }));
  return app;
};

describe('cache-control middleware', () => {
  it.each(['development', 'test'])('disables every cache in %s', async (environment) => {
    const app = createTestApp(environment);
    const initialResponse = await request(app).get('/docs/swagger-ui.css');
    const response = await request(app)
      .get('/docs/swagger-ui.css')
      .set('If-None-Match', initialResponse.headers.etag);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe(cacheControlPolicies.noStore);
    expect(response.headers.pragma).toBe('no-cache');
    expect(response.headers.expires).toBe('0');
    expect(response.headers['surrogate-control']).toBe('no-store');
  });

  it('uses standard production caches according to the resource type', async () => {
    const app = createTestApp('production');
    const [api, docs, contract, staticAsset] = await Promise.all([
      request(app).get('/api/v1/materials'),
      request(app).get('/docs'),
      request(app).get('/docs/openapi.json'),
      request(app).get('/docs/swagger-ui.css'),
    ]);

    expect(api.headers['cache-control']).toBe(cacheControlPolicies.privateRevalidate);
    expect(api.headers.vary).toContain('Authorization');
    expect(docs.headers['cache-control']).toBe(cacheControlPolicies.publicRevalidate);
    expect(contract.headers['cache-control']).toBe(cacheControlPolicies.publicShort);
    expect(staticAsset.headers['cache-control']).toBe(cacheControlPolicies.publicStatic);
  });

  it('never stores production health, authentication or mutation responses', async () => {
    const app = createTestApp('production');
    const [health, authentication, mutation] = await Promise.all([
      request(app).get('/health'),
      request(app).get('/api/v1/auth/session'),
      request(app).post('/api/v1/materials'),
    ]);

    expect(health.headers['cache-control']).toBe(cacheControlPolicies.noStore);
    expect(authentication.headers['cache-control']).toBe(cacheControlPolicies.noStore);
    expect(mutation.headers['cache-control']).toBe(cacheControlPolicies.noStore);
  });
});
