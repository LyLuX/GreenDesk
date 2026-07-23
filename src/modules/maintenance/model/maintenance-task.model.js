import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../config/database.js';
import { MAINTENANCE_PRIORITIES, MAINTENANCE_TYPES } from '../maintenance.constants.js';

class MaintenanceTask extends Model {}

MaintenanceTask.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    materialId: { type: DataTypes.BIGINT.UNSIGNED, field: 'material_id', allowNull: false },
    title: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    maintenanceType: {
      type: DataTypes.ENUM(...MAINTENANCE_TYPES),
      field: 'maintenance_type',
      allowNull: false,
    },
    intervalHours: { type: DataTypes.DECIMAL(10, 2), field: 'interval_hours', allowNull: true },
    intervalDays: { type: DataTypes.INTEGER.UNSIGNED, field: 'interval_days', allowNull: true },
    lastMaintenanceDate: {
      type: DataTypes.DATEONLY,
      field: 'last_maintenance_date',
      allowNull: true,
    },
    lastEngineHours: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'last_engine_hours',
      allowNull: true,
    },
    nextMaintenanceDate: {
      type: DataTypes.DATEONLY,
      field: 'next_maintenance_date',
      allowNull: true,
    },
    nextEngineHours: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'next_engine_hours',
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM(...MAINTENANCE_PRIORITIES),
      defaultValue: 'normal',
      allowNull: false,
    },
    active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by', allowNull: true },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by', allowNull: true },
  },
  { sequelize, modelName: 'MaintenanceTask', tableName: 'maintenance_tasks', paranoid: true },
);

export default MaintenanceTask;
