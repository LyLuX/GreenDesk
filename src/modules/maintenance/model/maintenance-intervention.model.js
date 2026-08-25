import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Unplanned maintenance work recorded independently from a maintenance plan. */
class MaintenanceIntervention extends Model {}

MaintenanceIntervention.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    companyId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'company_id' },
    materialId: { type: DataTypes.BIGINT.UNSIGNED, field: 'material_id', allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    performedAt: { type: DataTypes.DATEONLY, field: 'performed_at', allowNull: false },
    performedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'performed_by', allowNull: true },
  },
  {
    sequelize,
    modelName: 'MaintenanceIntervention',
    tableName: 'maintenance_interventions',
    updatedAt: false,
  },
);

export default MaintenanceIntervention;
