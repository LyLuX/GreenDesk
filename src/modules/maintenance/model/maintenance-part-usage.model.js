import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Immutable priced line for a part actually consumed during maintenance. */
class MaintenancePartUsage extends Model {}

MaintenancePartUsage.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    maintenanceHistoryId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'maintenance_history_id',
      allowNull: false,
    },
    maintenancePartId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'maintenance_part_id',
      allowNull: true,
    },
    partUuid: { type: DataTypes.UUID, field: 'part_uuid', allowNull: false },
    partName: { type: DataTypes.STRING(150), field: 'part_name', allowNull: false },
    partReference: {
      type: DataTypes.STRING(150),
      field: 'part_reference',
      allowNull: false,
    },
    unit: { type: DataTypes.STRING(50), allowNull: false },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(12, 2), field: 'unit_price', allowNull: false },
    totalCost: { type: DataTypes.DECIMAL(14, 2), field: 'total_cost', allowNull: false },
    performedAt: { type: DataTypes.DATEONLY, field: 'performed_at', allowNull: false },
  },
  {
    sequelize,
    modelName: 'MaintenancePartUsage',
    tableName: 'maintenance_part_usages',
    updatedAt: false,
    paranoid: false,
  },
);

export default MaintenancePartUsage;
