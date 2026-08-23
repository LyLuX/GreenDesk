import { successResponse } from '../../../core/responses/api-response.js';
import { hasPermission } from '../../../core/middlewares/authorization.middleware.js';
import DashboardService from '../service/dashboard.service.js';
import maintenancePermissions from '../../maintenance/maintenance.permissions.js';
import dashboardPermissions from '../dashboard.permissions.js';

/** Maps dashboard summary requests to the service. */
export default class DashboardController {
  constructor(service = new DashboardService()) {
    this.service = service;
  }
  async summary(request, response) {
    const includeMaintenance = hasPermission(request, maintenancePermissions.plans.read);
    const includeLowStock = hasPermission(request, maintenancePermissions.parts.read);
    const includeFinancial = hasPermission(request, dashboardPermissions.financial);
    response.json(
      successResponse(
        await this.service.getSummary({ includeMaintenance, includeLowStock, includeFinancial }),
      ),
    );
  }
}
