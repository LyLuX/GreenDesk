import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Configurable property definition for future category-linked business entities. */
class Property extends Model {}

Property.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    type: { type: DataTypes.ENUM('text', 'number', 'boolean', 'select'), allowNull: false },
    unit: { type: DataTypes.STRING(50), allowNull: true },
    required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'created_by' },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'updated_by' },
  },
  { sequelize, modelName: 'Property', tableName: 'properties', paranoid: true },
);

export default Property;
