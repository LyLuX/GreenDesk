import { successResponse } from '../../../core/responses/api-response.js';
import { hasPermission } from '../../../core/middlewares/authorization.middleware.js';
import DashboardService from '../service/dashboard.service.js';
import maintenancePermissions from '../../maintenance/maintenance.permissions.js';

/** Maps dashboard summary requests to the service. */
export default class DashboardController {
  constructor(service = new DashboardService()) {
    this.service = service;
  }
  async summary(request, response) {
    const includeMaintenance = hasPermission(request, maintenancePermissions.plans.read);
    response.json(successResponse(await this.service.getSummary({ includeMaintenance })));
  }
}
