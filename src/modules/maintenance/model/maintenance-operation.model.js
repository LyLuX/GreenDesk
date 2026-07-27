import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';
import { MAINTENANCE_TYPES } from '../maintenance.constants.js';

/** Reusable user-facing operation selected by maintenance plans. */
class MaintenanceOperation extends Model {}

MaintenanceOperation.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    maintenanceType: {
      type: DataTypes.ENUM(...MAINTENANCE_TYPES),
      field: 'maintenance_type',
      allowNull: false,
    },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by', allowNull: true },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by', allowNull: true },
  },
  {
    sequelize,
    modelName: 'MaintenanceOperation',
    tableName: 'maintenance_operations',
    paranoid: true,
  },
);

export default MaintenanceOperation;
