import { jest } from '@jest/globals';

import MaintenanceCatalogController from '../src/modules/maintenance/controller/maintenance-catalog.controller.js';
import MaintenanceController from '../src/modules/maintenance/controller/maintenance.controller.js';

const createResponse = () => {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
};
const createIdempotencyService = () => ({
  execute: jest.fn(async (options, handler) => ({
    statusCode: options.statusCode,
    body: await handler(),
    replayed: false,
  })),
});
const baseRequest = {
  idempotencyKey: 'critical-write-key',
  user: { userId: 7 },
};

describe('maintenance idempotent controllers', () => {
  it('wraps planned maintenance execution with its target and full body', async () => {
    const service = { execute: jest.fn().mockResolvedValue({ uuid: 'task-uuid' }) };
    const idempotencyService = createIdempotencyService();
    const controller = new MaintenanceController(service, idempotencyService);
    const response = createResponse();
    const request = {
      ...baseRequest,
      params: { uuid: 'task-uuid' },
      body: { partsAction: 'consume' },
    };

    await controller.execute(request, response);

    expect(idempotencyService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'critical-write-key',
        operation: 'maintenance.execute',
        request: { resourceUuid: 'task-uuid', body: request.body },
      }),
      expect.any(Function),
    );
    expect(service.execute).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('wraps an unplanned intervention and preserves its created response', async () => {
    const service = { createIntervention: jest.fn().mockResolvedValue({ uuid: 'intervention' }) };
    const idempotencyService = createIdempotencyService();
    const controller = new MaintenanceController(service, idempotencyService);
    const response = createResponse();
    const request = { ...baseRequest, body: { description: 'Réparation' } };

    await controller.createIntervention(request, response);

    expect(idempotencyService.execute).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'maintenance.intervention.create', statusCode: 201 }),
      expect.any(Function),
    );
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: { uuid: 'intervention' },
    });
  });

  it('wraps stock adjustments, orders and receipts with the part target', async () => {
    const service = { updatePartStock: jest.fn().mockResolvedValue({ uuid: 'part-uuid' }) };
    const idempotencyService = createIdempotencyService();
    const controller = new MaintenanceCatalogController(service, idempotencyService);
    const response = createResponse();
    const request = {
      ...baseRequest,
      params: { uuid: 'part-uuid' },
      body: { operation: 'order', quantity: 2 },
    };

    await controller.updatePartStock(request, response);

    expect(idempotencyService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'maintenance.part.stock.update',
        request: { resourceUuid: 'part-uuid', body: request.body },
      }),
      expect.any(Function),
    );
    expect(service.updatePartStock).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(200);
  });
});
