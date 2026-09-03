import request from 'supertest';

import app from '../src/app.js';
import env from '../src/config/env.js';

describe('GET /api/v1', () => {
  it('publishes the upload limits enforced by the API', async () => {
    const response = await request(app).get('/api/v1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        name: 'GreenDesk API',
        version: 'v1',
        uploadLimits: env.uploads,
      },
    });
  });
});
