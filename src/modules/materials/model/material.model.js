import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Material catalogue entry, kept independent from categories during Sprint 3. */
class Material extends Model {}

Material.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    reference: { type: DataTypes.STRING(100), allowNull: true, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    unit: { type: DataTypes.STRING(50), allowNull: false },
    purchasePrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'purchase_price',
    },
    salePrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'sale_price',
    },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'created_by' },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'updated_by' },
  },
  { sequelize, modelName: 'Material', tableName: 'materials', paranoid: true },
);

export default Material;
