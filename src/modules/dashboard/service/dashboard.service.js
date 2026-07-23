import DashboardRepository from '../repository/dashboard.repository.js';

/** Aggregates dashboard statistics without HTTP concerns. */
export default class DashboardService {
  constructor(repository = new DashboardRepository()) {
    this.repository = repository;
  }
  async getSummary() {
    const counts = await this.repository.getCounts();
    return {
      materials: {
        total: counts.materialsTotal,
        active: counts.materialsActive,
        inactive: counts.materialsInactive,
      },
      categories: { total: counts.categoriesTotal },
      properties: { total: counts.propertiesTotal },
    };
  }
}
