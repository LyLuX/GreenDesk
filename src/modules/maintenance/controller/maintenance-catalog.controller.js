import HTTP_STATUS from '../../../core/constants/http-status.js';
import { successResponse } from '../../../core/responses/api-response.js';
import MaintenanceCatalogService from '../service/maintenance-catalog.service.js';

/** HTTP adapter for reusable maintenance operations and exact parts. */
export default class MaintenanceCatalogController {
  constructor(service = new MaintenanceCatalogService()) {
    this.service = service;
  }

  async operations(request, response) {
    response.json(successResponse(await this.service.getOperations(request.query)));
  }

  async createOperation(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(successResponse(await this.service.createOperation(request.body, request.user.userId)));
  }

  async updateOperation(request, response) {
    response.json(
      successResponse(
        await this.service.updateOperation(request.params.uuid, request.body, request.user.userId),
      ),
    );
  }

  async removeOperation(request, response) {
    await this.service.removeOperation(request.params.uuid, request.user.userId);
    response.status(HTTP_STATUS.NO_CONTENT).send();
  }

  async parts(request, response) {
    response.json(successResponse(await this.service.getParts(request.query)));
  }

  async createPart(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(successResponse(await this.service.createPart(request.body, request.user.userId)));
  }

  async updatePart(request, response) {
    response.json(
      successResponse(
        await this.service.updatePart(request.params.uuid, request.body, request.user.userId),
      ),
    );
  }

  async updatePartStock(request, response) {
    response.json(
      successResponse(
        await this.service.updatePartStock(request.params.uuid, request.body, request.user.userId),
      ),
    );
  }

  async partStockMovements(request, response) {
    response.json(
      successResponse(await this.service.getPartStockMovements(request.params.uuid, request.query)),
    );
  }

  async removePart(request, response) {
    await this.service.removePart(request.params.uuid, request.user.userId);
    response.status(HTTP_STATUS.NO_CONTENT).send();
  }
}
