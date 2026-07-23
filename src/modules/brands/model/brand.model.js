import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../config/database.js';

class Brand extends Model {}
Brand.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, unique: true, allowNull: false },
    name: { type: DataTypes.STRING(150), unique: true, allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by' },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by' },
  },
  { sequelize, modelName: 'Brand', tableName: 'brands', paranoid: true },
);
export default Brand;
