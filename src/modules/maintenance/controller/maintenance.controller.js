import HTTP_STATUS from '../../../core/constants/http-status.js';
import { successResponse } from '../../../core/responses/api-response.js';
import MaintenanceService from '../service/maintenance.service.js';

export default class MaintenanceController {
  constructor(service = new MaintenanceService()) {
    this.service = service;
  }
  async getAll(request, response) {
    response.json(successResponse(await this.service.getAll(request.query)));
  }
  async getByUuid(request, response) {
    response.json(successResponse(await this.service.getByUuid(request.params.uuid)));
  }
  async create(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(successResponse(await this.service.create(request.body, request.user.userId)));
  }
  async update(request, response) {
    response.json(
      successResponse(
        await this.service.update(request.params.uuid, request.body, request.user.userId),
      ),
    );
  }
  async status(request, response) {
    response.json(
      successResponse(
        await this.service.changeStatus(
          request.params.uuid,
          request.body.active,
          request.user.userId,
        ),
      ),
    );
  }
  async execute(request, response) {
    response.json(
      successResponse(
        await this.service.execute(request.params.uuid, request.body, request.user.userId),
      ),
    );
  }
  async history(request, response) {
    response.json(successResponse(await this.service.getHistory(request.params.uuid)));
  }
}
