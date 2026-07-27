import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../config/database.js';

class MaintenanceTask extends Model {}

MaintenanceTask.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    materialId: { type: DataTypes.BIGINT.UNSIGNED, field: 'material_id', allowNull: false },
    templateId: { type: DataTypes.BIGINT.UNSIGNED, field: 'template_id', allowNull: false },
    lastMaintenanceDate: {
      type: DataTypes.DATEONLY,
      field: 'last_maintenance_date',
      allowNull: false,
    },
    nextMaintenanceDate: {
      type: DataTypes.DATEONLY,
      field: 'next_maintenance_date',
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
