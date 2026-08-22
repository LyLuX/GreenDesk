import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../config/database.js';
import { STOCK_OPERATION_VALUES } from './stock-operation.js';

/** Immutable movement journal shared by every stock-backed entity. */
class StockMovement extends Model {}

StockMovement.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    stockableType: {
      type: DataTypes.STRING(60),
      field: 'stockable_type',
      allowNull: false,
    },
    stockableId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'stockable_id',
      allowNull: false,
    },
    operation: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: { isIn: [STOCK_OPERATION_VALUES] },
    },
    quantityOnHandChange: {
      type: DataTypes.INTEGER,
      field: 'quantity_on_hand_change',
      allowNull: false,
      defaultValue: 0,
    },
    quantityOnOrderChange: {
      type: DataTypes.INTEGER,
      field: 'quantity_on_order_change',
      allowNull: false,
      defaultValue: 0,
    },
    quantityOnHandAfter: {
      type: DataTypes.INTEGER.UNSIGNED,
      field: 'quantity_on_hand_after',
      allowNull: false,
    },
    quantityOnOrderAfter: {
      type: DataTypes.INTEGER.UNSIGNED,
      field: 'quantity_on_order_after',
      allowNull: false,
    },
    sourceType: { type: DataTypes.STRING(60), field: 'source_type', allowNull: true },
    sourceUuid: { type: DataTypes.UUID, field: 'source_uuid', allowNull: true },
    performedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'performed_by',
      allowNull: true,
    },
    performedAt: {
      type: DataTypes.DATEONLY,
      field: 'performed_at',
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'StockMovement',
    tableName: 'inventory_stock_movements',
    updatedAt: false,
  },
);

export default StockMovement;
