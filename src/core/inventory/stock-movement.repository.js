import StockMovement from './stock-movement.model.js';
import { companyValues, companyWhere } from '../company/company-context.js';

/** Generic persistence adapter for the immutable stock journal. */
export default class StockMovementRepository {
  create(values, { transaction } = {}) {
    return StockMovement.create(companyValues(values), { transaction });
  }

  async findByStockable(stockableType, stockableId, { page = 1, limit = 20 } = {}) {
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const result = await StockMovement.findAndCountAll({
      where: companyWhere({ stockableType, stockableId }),
      order: [
        ['performedAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: normalizedLimit,
      offset: (normalizedPage - 1) * normalizedLimit,
    });
    return {
      items: result.rows,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total: result.count,
        totalPages: Math.max(Math.ceil(result.count / normalizedLimit), 1),
      },
    };
  }
}
