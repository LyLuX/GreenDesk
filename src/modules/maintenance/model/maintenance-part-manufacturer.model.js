import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Reusable manufacturer referenced by exact maintenance parts. */
class MaintenancePartManufacturer extends Model {}

MaintenancePartManufacturer.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by', allowNull: true },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by', allowNull: true },
  },
  {
    sequelize,
    modelName: 'MaintenancePartManufacturer',
    tableName: 'maintenance_part_manufacturers',
    paranoid: true,
  },
);

export default MaintenancePartManufacturer;
