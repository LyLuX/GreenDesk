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
    description: { type: DataTypes.TEXT, allowNull: true },
    unit: { type: DataTypes.STRING(50), allowNull: false },
    purchasePrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'purchase_price',
    },
    manufacturerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'manufacturer_id',
    },
    categoryId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'category_id' },
    model: { type: DataTypes.STRING(150), allowNull: true },
    serialNumber: {
      type: DataTypes.STRING(150),
      allowNull: true,
      unique: true,
      field: 'serial_number',
    },
    purchaseDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'purchase_date' },
    commissionedAt: { type: DataTypes.DATEONLY, allowNull: true, field: 'commissioned_at' },
    retiredAt: { type: DataTypes.DATEONLY, allowNull: true, field: 'retired_at' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'created_by' },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'updated_by' },
  },
  { sequelize, modelName: 'Material', tableName: 'materials', paranoid: true },
);

export default Material;
