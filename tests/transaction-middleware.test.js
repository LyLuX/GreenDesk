import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

import { createTransactionMiddleware } from '../src/core/middlewares/transaction.middleware.js';

const createDatabase = () => {
  const state = { commits: 0, rollbacks: 0 };
  const database = {
    transaction: jest.fn(async (_options, callback) => {
      try {
        const result = await callback({ id: 'request-transaction' });
        state.commits += 1;
        return result;
      } catch (error) {
        state.rollbacks += 1;
        throw error;
      }
    }),
  };
  return { database, state };
};

const createApp = (database) => {
  const app = express();
  app.use(createTransactionMiddleware(database));
  app.get('/success', (_request, response) => response.json({ success: true }));
  app.get('/rejected', (_request, response) => response.status(400).json({ success: false }));
  return app;
};

describe('request transaction middleware', () => {
  it('commits a successful response before releasing it', async () => {
    const { database, state } = createDatabase();

    const response = await request(createApp(database)).get('/success');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(state).toEqual({ commits: 1, rollbacks: 0 });
    expect(database.transaction).toHaveBeenCalledWith(
      expect.objectContaining({ isolationLevel: 'READ COMMITTED' }),
      expect.any(Function),
    );
  });

  it('rolls back a rejected response and preserves its payload', async () => {
    const { database, state } = createDatabase();

    const response = await request(createApp(database)).get('/rejected');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false });
    expect(state).toEqual({ commits: 0, rollbacks: 1 });
  });
});
