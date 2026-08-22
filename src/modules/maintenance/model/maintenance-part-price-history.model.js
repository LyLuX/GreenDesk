import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Immutable journal of every maintenance-part unit-price change. */
class MaintenancePartPriceHistory extends Model {}

MaintenancePartPriceHistory.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    maintenancePartId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'maintenance_part_id',
      allowNull: false,
    },
    previousUnitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      field: 'previous_unit_price',
      allowNull: false,
    },
    unitPrice: { type: DataTypes.DECIMAL(12, 2), field: 'unit_price', allowNull: false },
    changedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'changed_by', allowNull: true },
    performedAt: {
      type: DataTypes.DATEONLY,
      field: 'performed_at',
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'MaintenancePartPriceHistory',
    tableName: 'maintenance_part_price_history',
    updatedAt: false,
    paranoid: false,
  },
);

export default MaintenancePartPriceHistory;
