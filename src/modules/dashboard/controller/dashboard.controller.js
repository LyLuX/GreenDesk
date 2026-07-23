import { successResponse } from '../../../core/responses/api-response.js';
import DashboardService from '../service/dashboard.service.js';

/** Maps dashboard summary requests to the service. */
export default class DashboardController {
  constructor(service = new DashboardService()) {
    this.service = service;
  }
  async summary(_request, response) {
    response.json(successResponse(await this.service.getSummary()));
  }
}
