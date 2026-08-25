import { DataTypes, Model } from 'sequelize';

import sequelize from '../../../config/database.js';

/** Quantity of an exact part required by one maintenance plan. */
class MaintenanceTaskPart extends Model {}

MaintenanceTaskPart.init(
  {
    companyId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'company_id' },
    maintenanceTaskId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'maintenance_task_id',
      allowNull: false,
      primaryKey: true,
    },
    maintenancePartId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'maintenance_part_id',
      allowNull: false,
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 1,
      validate: { min: 0.01, max: 100000 },
    },
  },
  {
    sequelize,
    modelName: 'MaintenanceTaskPart',
    tableName: 'maintenance_task_parts',
    paranoid: false,
  },
);

export default MaintenanceTaskPart;
