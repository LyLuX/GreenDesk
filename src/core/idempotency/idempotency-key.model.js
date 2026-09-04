import { DataTypes, Model } from 'sequelize';

import sequelize from '../../config/database.js';

/** Stores completed critical API writes so an identical request can be replayed safely. */
class IdempotencyKey extends Model {}

IdempotencyKey.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    companyId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'company_id' },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    operation: { type: DataTypes.STRING(80), allowNull: false },
    keyHash: { type: DataTypes.CHAR(64).BINARY, allowNull: false, field: 'key_hash' },
    requestHash: { type: DataTypes.CHAR(64).BINARY, allowNull: false, field: 'request_hash' },
    responseStatus: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: true,
      field: 'response_status',
    },
    responseBody: { type: DataTypes.JSON, allowNull: true, field: 'response_body' },
  },
  {
    sequelize,
    modelName: 'IdempotencyKey',
    tableName: 'api_idempotency_keys',
    paranoid: false,
    indexes: [
      {
        name: 'uq_api_idempotency_company_user_key_hash',
        unique: true,
        fields: ['company_id', 'user_id', 'key_hash'],
      },
    ],
  },
);

export default IdempotencyKey;
