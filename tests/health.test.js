import request from 'supertest';
import { jest } from '@jest/globals';

import app from '../src/app.js';
import sequelize from '../src/config/database.js';

describe('GET /health', () => {
  it('returns the API health status', async () => {
    jest.spyOn(sequelize, 'authenticate').mockResolvedValue();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'UP',
        database: 'UP',
        version: '1.0.0',
        environment: 'test',
      }),
    );
    expect(response.body.uptime).toEqual(expect.any(Number));
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');

    jest.restoreAllMocks();
  });

  it('returns a service-unavailable status when MySQL is down', async () => {
    jest.spyOn(sequelize, 'authenticate').mockRejectedValue(new Error('MySQL unavailable'));

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: 'DOWN', database: 'DOWN' });

    jest.restoreAllMocks();
  });
});
