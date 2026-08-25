import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Global supplier referenced by exact maintenance parts. */
class Supplier extends Model {}

Supplier.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    companyId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'company_id' },
    name: { type: DataTypes.STRING(150), allowNull: false },
    contactName: { type: DataTypes.STRING(150), field: 'contact_name', allowNull: true },
    email: { type: DataTypes.STRING(254), allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by', allowNull: true },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by', allowNull: true },
  },
  {
    sequelize,
    modelName: 'Supplier',
    tableName: 'suppliers',
    paranoid: true,
    indexes: [{ unique: true, fields: ['company_id', 'name'] }],
  },
);

export default Supplier;
