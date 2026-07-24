import DashboardRepository from '../repository/dashboard.repository.js';

/** Aggregates dashboard statistics without HTTP concerns. */
export default class DashboardService {
  constructor(repository = new DashboardRepository()) {
    this.repository = repository;
  }
  async getSummary() {
    const counts = await this.repository.getCounts();
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
    if (counts.maintenanceToday !== undefined)
      summary.maintenance = {
        today: counts.maintenanceToday,
        overdue: counts.maintenanceOverdue,
        upcoming: counts.maintenanceUpcoming,
      };
    return summary;
  }
}
