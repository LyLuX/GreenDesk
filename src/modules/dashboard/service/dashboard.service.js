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
  async getSummary({ includeMaintenance = true } = {}) {
    const counts = await this.repository.getCounts({ includeMaintenance });
    const currentYear = new Date().getUTCFullYear();
    const maintenanceCostByYear = new Map(
      (counts.maintenanceCosts ?? []).map(({ year, total }) => [Number(year), Number(total)]),
    );
    const maintenanceStockValues = counts.maintenanceStockValues ?? {};
    const maintenanceItems = (counts.maintenanceTasks ?? []).map((task) =>
      this.maintenanceService.toPublic(task),
    );
    const maintenance = {
      today: maintenanceItems.filter(({ status }) => status === 'dueToday'),
      overdue: maintenanceItems.filter(({ status }) => status === 'overdue'),
      upcoming: maintenanceItems.filter(({ status }) => status === 'upcoming'),
      wearBased: maintenanceItems.filter(({ status }) => status === 'wearBased'),
    };
    const summary = {
      materials: {
        total: counts.materialsTotal,
        active: counts.materialsActive,
        inactive: counts.materialsInactive,
      },
      categories: { total: counts.categoriesTotal },
    };
    if (counts.manufacturersTotal !== undefined) {
      summary.manufacturers = { total: counts.manufacturersTotal };
    }
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
        wearBased: maintenance.wearBased.length,
        stockValues: {
          onHand: Number(maintenanceStockValues.onHand ?? 0),
          onOrder: Number(maintenanceStockValues.onOrder ?? 0),
        },
        costs: Array.from({ length: 3 }, (_value, index) => ({
          year: currentYear - index,
          total: maintenanceCostByYear.get(currentYear - index) ?? 0,
        })),
        items: maintenance,
      };
    return summary;
  }
}
