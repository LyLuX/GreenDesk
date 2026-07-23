import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../config/database.js';

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
    engineHours: { type: DataTypes.DECIMAL(10, 2), field: 'engine_hours', allowNull: true },
    comment: { type: DataTypes.TEXT, allowNull: true },
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
