import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';
import { getStockAvailability } from '../../../core/inventory/stock-status.js';

/** Exact orderable part reference reusable across maintenance plans. */
class MaintenancePart extends Model {}

MaintenancePart.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    manufacturer: { type: DataTypes.STRING(150), allowNull: true },
    manufacturerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'manufacturer_id',
      allowNull: true,
    },
    supplier: { type: DataTypes.STRING(150), allowNull: true },
    supplierId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'supplier_id',
      allowNull: true,
    },
    reference: { type: DataTypes.STRING(150), allowNull: false },
    supplierReference: {
      type: DataTypes.STRING(150),
      field: 'supplier_reference',
      allowNull: true,
    },
    unit: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'pièce' },
    quantityOnHand: {
      type: DataTypes.INTEGER.UNSIGNED,
      field: 'quantity_on_hand',
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 1000000 },
    },
    quantityOnOrder: {
      type: DataTypes.INTEGER.UNSIGNED,
      field: 'quantity_on_order',
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 1000000 },
    },
    stockStatus: {
      type: DataTypes.VIRTUAL,
      get() {
        return getStockAvailability(this).status;
      },
    },
    stockQuantity: {
      type: DataTypes.VIRTUAL,
      get() {
        return Number(this.quantityOnHand ?? 0) + Number(this.quantityOnOrder ?? 0);
      },
    },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by', allowNull: true },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by', allowNull: true },
  },
  {
    sequelize,
    modelName: 'MaintenancePart',
    tableName: 'maintenance_parts',
    paranoid: true,
  },
);

export default MaintenancePart;
