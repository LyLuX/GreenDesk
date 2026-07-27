import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../config/database.js';
import { MAINTENANCE_PRIORITIES, MAINTENANCE_TYPES } from '../maintenance.constants.js';

class MaintenanceTemplate extends Model {}

MaintenanceTemplate.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    brandId: { type: DataTypes.BIGINT.UNSIGNED, field: 'brand_id', allowNull: false },
    materialModel: { type: DataTypes.STRING(150), field: 'material_model', allowNull: false },
    title: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    maintenanceType: {
      type: DataTypes.ENUM(...MAINTENANCE_TYPES),
      field: 'maintenance_type',
      allowNull: false,
    },
    intervalDays: {
      type: DataTypes.INTEGER.UNSIGNED,
      field: 'interval_days',
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM(...MAINTENANCE_PRIORITIES),
      allowNull: false,
      defaultValue: 'normal',
    },
    partReference: { type: DataTypes.STRING(150), field: 'part_reference', allowNull: true },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    instructions: { type: DataTypes.TEXT, allowNull: true },
    active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by', allowNull: true },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by', allowNull: true },
  },
  {
    sequelize,
    modelName: 'MaintenanceTemplate',
    tableName: 'maintenance_templates',
    paranoid: true,
  },
);

export default MaintenanceTemplate;
