import { describe, expect, it } from 'vitest';

import { idempotencyRequestConfig, resolveIdempotencyAttempt } from './idempotency.js';

describe('API idempotency helpers', () => {
  it('keeps the same key for an unchanged retry regardless of object key order', () => {
    const first = resolveIdempotencyAttempt(null, {
      resourceUuid: 'part-uuid',
      body: { operation: 'order', quantity: 2 },
    });
    const retry = resolveIdempotencyAttempt(first, {
      body: { quantity: 2, operation: 'order' },
      resourceUuid: 'part-uuid',
    });

    expect(retry).toBe(first);
    expect(retry.key).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('creates a new key when the write intent changes', () => {
    const first = resolveIdempotencyAttempt(null, { quantity: 2 });
    const changed = resolveIdempotencyAttempt(first, { quantity: 3 });

    expect(changed.key).not.toBe(first.key);
    expect(idempotencyRequestConfig(changed.key)).toEqual({
      headers: { 'Idempotency-Key': changed.key },
    });
  });
});
