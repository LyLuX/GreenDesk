import HTTP_STATUS from '../../../core/constants/http-status.js';
import IdempotencyService from '../../../core/idempotency/idempotency.service.js';
import { successResponse } from '../../../core/responses/api-response.js';
import MaintenanceService from '../service/maintenance.service.js';

export default class MaintenanceController {
  constructor(service = new MaintenanceService(), idempotencyService = new IdempotencyService()) {
    this.service = service;
    this.idempotencyService = idempotencyService;
  }
  async getAll(request, response) {
    response.json(successResponse(await this.service.getAll(request.query)));
  }
  async getByUuid(request, response) {
    response.json(successResponse(await this.service.getByUuid(request.params.uuid)));
  }
  async orderList(request, response) {
    response.json(successResponse(await this.service.getOrderList(request.query)));
  }
  async sheets(request, response) {
    response.json(successResponse(await this.service.getMaintenanceSheets(request.query)));
  }
  async recordSheetPrint(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(successResponse(await this.service.recordSheetPrint(request.user.userId)));
  }
  async interventions(request, response) {
    response.json(successResponse(await this.service.getInterventions(request.query)));
  }
  async createIntervention(request, response) {
    const result = await this.idempotencyService.execute(
      {
        key: request.idempotencyKey,
        userId: request.user.userId,
        operation: 'maintenance.intervention.create',
        request: { body: request.body },
        statusCode: HTTP_STATUS.CREATED,
      },
      async () =>
        successResponse(await this.service.createIntervention(request.body, request.user.userId)),
    );
    response.status(result.statusCode).json(result.body);
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
  async remove(request, response) {
    await this.service.remove(request.params.uuid, request.user.userId);
    response.status(HTTP_STATUS.NO_CONTENT).send();
  }
  async execute(request, response) {
    const result = await this.idempotencyService.execute(
      {
        key: request.idempotencyKey,
        userId: request.user.userId,
        operation: 'maintenance.execute',
        request: { resourceUuid: request.params.uuid, body: request.body },
        statusCode: HTTP_STATUS.OK,
      },
      async () =>
        successResponse(
          await this.service.execute(request.params.uuid, request.body, request.user.userId),
        ),
    );
    response.status(result.statusCode).json(result.body);
  }
  async history(request, response) {
    response.json(
      successResponse(await this.service.getHistory(request.params.uuid, request.query)),
    );
  }
}
