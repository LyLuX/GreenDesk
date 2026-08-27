import { describe, expect, it, jest } from '@jest/globals';

import RelationsController from '../src/modules/relations/controller/relations.controller.js';

describe('RelationsController', () => {
  it('forwards the requested mode and authenticated permissions', async () => {
    const graph = { mode: 'complete', company: null, nodes: [], edges: [] };
    const service = { getGraph: jest.fn().mockResolvedValue(graph) };
    const controller = new RelationsController(service);
    const response = { json: jest.fn() };

    await controller.getGraph(
      {
        query: { mode: 'complete', scope: 'records' },
        user: { permissions: ['relations.read'] },
      },
      response,
    );

    expect(service.getGraph).toHaveBeenCalledWith({
      mode: 'complete',
      scope: 'records',
      permissions: ['relations.read'],
    });
    expect(response.json).toHaveBeenCalledWith({ success: true, data: graph });
  });
});
