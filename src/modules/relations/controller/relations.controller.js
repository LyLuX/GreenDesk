import { successResponse } from '../../../core/responses/api-response.js';
import RelationsService from '../service/relations.service.js';

/** Exposes the company model relationship graph. */
export default class RelationsController {
  constructor(service = new RelationsService()) {
    this.service = service;
  }

  async getGraph(request, response) {
    response.json(
      successResponse(
        await this.service.getGraph({
          mode: request.query.mode,
          scope: request.query.scope,
          permissions: request.user?.permissions ?? [],
        }),
      ),
    );
  }
}
