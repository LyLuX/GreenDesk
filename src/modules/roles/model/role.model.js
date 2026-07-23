import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Role grouping the permissions assigned to a user. */
class Role extends Model {}

Role.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(500), allowNull: true },
  },
  { sequelize, modelName: 'Role', tableName: 'roles', paranoid: true },
);

export default Role;
