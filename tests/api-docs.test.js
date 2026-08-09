import express from 'express';
import request from 'supertest';

import { mountApiDocumentation } from '../src/config/api-docs.js';
import { cacheControlPolicies } from '../src/config/cache.js';
import { createCacheControlMiddleware } from '../src/core/middlewares/cache-control.middleware.js';
import { notFoundHandler } from '../src/core/middlewares/error-handler.js';

const specification = { openapi: '3.0.3', info: { title: 'Test', version: '1.0.0' }, paths: {} };

const createDocsApp = (enabled, environment) => {
  const app = express();
  app.use(createCacheControlMiddleware(environment));
  mountApiDocumentation(app, enabled, specification);
  app.use(notFoundHandler);
  return app;
};

describe('API documentation exposure', () => {
  it('serves Swagger and the raw contract when documentation is enabled', async () => {
    const app = createDocsApp(true, 'test');
    const [swagger, contract] = await Promise.all([
      request(app).get('/docs/'),
      request(app).get('/docs/openapi.json'),
    ]);

    expect(swagger.status).toBe(200);
    expect(swagger.text).toContain('Swagger UI');
    expect(contract.status).toBe(200);
    expect(contract.body).toEqual(specification);
  });

  it('does not mount either documentation endpoint in production', async () => {
    const app = createDocsApp(false, 'production');
    const [swagger, contract, staticAsset] = await Promise.all([
      request(app).get('/docs/'),
      request(app).get('/docs/openapi.json'),
      request(app).get('/docs/swagger-ui.css'),
    ]);

    for (const response of [swagger, contract, staticAsset]) {
      expect(response.status).toBe(404);
      expect(response.headers['cache-control']).toBe(cacheControlPolicies.noStore);
    }
  });
});
