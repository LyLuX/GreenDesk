import express from 'express';
import request from 'supertest';

import { errorHandler } from '../src/core/middlewares/error-handler.js';
import { requireIdempotencyKey } from '../src/core/middlewares/idempotency-key.middleware.js';

const createApp = () => {
  const app = express();
  app.post('/critical', requireIdempotencyKey, (httpRequest, response) =>
    response.json({ key: httpRequest.idempotencyKey }),
  );
  app.use(errorHandler);
  return app;
};

describe('Idempotency-Key middleware', () => {
  it('rejects a missing key on a critical write', async () => {
    const response = await request(createApp()).post('/critical').expect(400);

    expect(response.body.error.message).toContain('Idempotency-Key');
  });

  it.each(['contains spaces', 'contains,comma', 'x'.repeat(129)])(
    'rejects the malformed key %s',
    async (key) => {
      await request(createApp()).post('/critical').set('Idempotency-Key', key).expect(400);
    },
  );

  it('exposes a valid opaque key to the protected controller', async () => {
    const response = await request(createApp())
      .post('/critical')
      .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440000')
      .expect(200);

    expect(response.body.key).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
