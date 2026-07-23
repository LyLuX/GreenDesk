import { DataTypes, Model } from 'sequelize';

import sequelize from '../../../config/database.js';

/** Access token identifier revoked before its natural JWT expiration. */
class RevokedAccessToken extends Model {}

RevokedAccessToken.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    tokenId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'token_id' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
  },
  {
    sequelize,
    modelName: 'RevokedAccessToken',
    tableName: 'revoked_access_tokens',
    updatedAt: false,
  },
);

export default RevokedAccessToken;
