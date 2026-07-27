import DashboardRepository from '../repository/dashboard.repository.js';
import MaintenanceService from '../../maintenance/service/maintenance.service.js';

/** Aggregates dashboard statistics without HTTP concerns. */
export default class DashboardService {
  constructor(
    repository = new DashboardRepository(),
    maintenanceService = new MaintenanceService(),
  ) {
    this.repository = repository;
    this.maintenanceService = maintenanceService;
  }
  async getSummary() {
    const counts = await this.repository.getCounts();
    const maintenanceItems = (counts.maintenanceTasks ?? []).map((task) =>
      this.maintenanceService.toPublic(task),
    );
    const maintenance = {
      today: maintenanceItems.filter(({ status }) => status === 'dueToday'),
      overdue: maintenanceItems.filter(({ status }) => status === 'overdue'),
      upcoming: maintenanceItems.filter(({ status }) => status === 'upcoming'),
    };
    const summary = {
      materials: {
        total: counts.materialsTotal,
        active: counts.materialsActive,
        inactive: counts.materialsInactive,
      },
      categories: { total: counts.categoriesTotal },
    };
    if (counts.brandsTotal !== undefined) summary.brands = { total: counts.brandsTotal };
    if (counts.averageCost !== undefined)
      summary.fleet = {
        totalPurchaseValue: counts.totalPurchaseValue,
        averageCost: counts.averageCost,
        averageAge: counts.averageAge,
      };
    if (counts.maintenanceTasks !== undefined)
      summary.maintenance = {
        today: maintenance.today.length,
        overdue: maintenance.overdue.length,
        upcoming: maintenance.upcoming.length,
        items: maintenance,
      };
    return summary;
  }
}
