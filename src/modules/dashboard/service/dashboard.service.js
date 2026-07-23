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
      properties: { total: counts.propertiesTotal },
    };
    if (counts.brandsTotal !== undefined) summary.brands = { total: counts.brandsTotal };
    if (counts.totalValue !== undefined)
      summary.fleet = {
        totalValue: counts.totalValue,
        averageCost: counts.averageCost,
        averageAge: counts.averageAge,
      };
    return summary;
  }
}
