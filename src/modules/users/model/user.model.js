import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** User account persisted in the GreenDesk database. */
class User extends Model {
  /** Returns a user representation that never exposes a password hash. */
  toJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    delete values.authorizationVersion;
    return values;
  }
}

User.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    firstName: { type: DataTypes.STRING(100), allowNull: false },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      set(value) {
        this.setDataValue(
          'lastName',
          typeof value === 'string' ? value.trim().toLocaleUpperCase('fr-FR') : value,
        );
      },
    },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    emailVerifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'email_verified_at' },
    authorizationVersion: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'authorization_version',
    },
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
