import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));

vi.mock('./client.js', () => ({ default: client }));

import {
  createMaintenanceIntervention,
  executeMaintenance,
  updateMaintenancePartStock,
} from './maintenance.api.js';

describe('critical maintenance API writes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the mandatory idempotency key on every critical endpoint', () => {
    executeMaintenance('task-uuid', { partsAction: 'consume' }, 'execute-key');
    createMaintenanceIntervention({ description: 'Réparation' }, 'intervention-key');
    updateMaintenancePartStock('part-uuid', { operation: 'order', quantity: 2 }, 'stock-key');

    expect(client.post).toHaveBeenNthCalledWith(
      1,
      '/v1/maintenance/task-uuid/execute',
      { partsAction: 'consume' },
      { headers: { 'Idempotency-Key': 'execute-key' } },
    );
    expect(client.post).toHaveBeenNthCalledWith(
      2,
      '/v1/maintenance/interventions',
      { description: 'Réparation' },
      { headers: { 'Idempotency-Key': 'intervention-key' } },
    );
    expect(client.patch).toHaveBeenCalledWith(
      '/v1/maintenance/parts/part-uuid/stock',
      { operation: 'order', quantity: 2 },
      { headers: { 'Idempotency-Key': 'stock-key' } },
    );
  });
});
