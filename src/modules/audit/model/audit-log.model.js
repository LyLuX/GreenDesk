import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Immutable audit record for actions performed against domain entities. */
class AuditLog extends Model {}

AuditLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'user_id' },
    action: { type: DataTypes.STRING(100), allowNull: false },
    entity: { type: DataTypes.STRING(100), allowNull: false },
    entityUuid: { type: DataTypes.UUID, allowNull: true, field: 'entity_uuid' },
    oldValues: { type: DataTypes.JSON, allowNull: true, field: 'old_values' },
    newValues: { type: DataTypes.JSON, allowNull: true, field: 'new_values' },
  },
  { sequelize, modelName: 'AuditLog', tableName: 'audit_logs', updatedAt: false },
);

export default AuditLog;
