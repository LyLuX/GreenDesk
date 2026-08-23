import { DataTypes, Model } from 'sequelize';

import sequelize from '../../../config/database.js';

/** One-use, hashed token used to verify ownership of a registration email address. */
class EmailVerificationToken extends Model {}

EmailVerificationToken.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true, field: 'token_hash' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    usedAt: { type: DataTypes.DATE, allowNull: true, field: 'used_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
  },
  {
    sequelize,
    modelName: 'EmailVerificationToken',
    tableName: 'email_verification_tokens',
    updatedAt: false,
    paranoid: false,
  },
);

export default EmailVerificationToken;
