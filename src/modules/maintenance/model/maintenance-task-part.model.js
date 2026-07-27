import { DataTypes, Model } from 'sequelize';

import sequelize from '../../../config/database.js';

/** Quantity of an exact part required by one maintenance plan. */
class MaintenanceTaskPart extends Model {}

MaintenanceTaskPart.init(
  {
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
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
  },
  {
    sequelize,
    modelName: 'MaintenanceTaskPart',
    tableName: 'maintenance_task_parts',
    paranoid: false,
  },
);

export default MaintenanceTaskPart;
