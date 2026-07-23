import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** User account persisted in the GreenDesk database. */
class User extends Model {
  /** Returns a user representation that never exposes a password hash. */
  toJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  }
}

User.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    firstName: { type: DataTypes.STRING(100), allowNull: false },
    lastName: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    paranoid: true,
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: {} } },
  },
);

export default User;
