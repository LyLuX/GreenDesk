import request from 'supertest';

import app from '../src/app.js';

describe('GET /health', () => {
  it('returns the API health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.headers['x-request-id']).toBeDefined();
  });
});
