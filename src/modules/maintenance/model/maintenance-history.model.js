import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../config/database.js';
import { MAINTENANCE_EXECUTION_TYPES } from '../maintenance.constants.js';

class MaintenanceHistory extends Model {}

MaintenanceHistory.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    maintenanceTaskId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'maintenance_task_id',
      allowNull: false,
    },
    performedAt: { type: DataTypes.DATEONLY, field: 'performed_at', allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
    executionType: {
      type: DataTypes.STRING(40),
      field: 'execution_type',
      allowNull: false,
      defaultValue: MAINTENANCE_EXECUTION_TYPES.STANDARD,
      validate: { isIn: [Object.values(MAINTENANCE_EXECUTION_TYPES)] },
    },
    partsSnapshot: { type: DataTypes.JSON, field: 'parts_snapshot', allowNull: true },
    performedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'performed_by', allowNull: true },
  },
  {
    sequelize,
    modelName: 'MaintenanceHistory',
    tableName: 'maintenance_history',
    updatedAt: false,
  },
);

export default MaintenanceHistory;
