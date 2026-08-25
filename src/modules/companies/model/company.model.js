import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Highest-level business boundary used to isolate every GreenDesk domain record. */
class Company extends Model {}

Company.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, modelName: 'Company', tableName: 'companies', paranoid: true },
);

export default Company;
