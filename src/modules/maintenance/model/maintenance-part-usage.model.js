import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Immutable priced line for a part actually consumed during maintenance. */
class MaintenancePartUsage extends Model {}

MaintenancePartUsage.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    companyId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'company_id' },
    maintenanceHistoryId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'maintenance_history_id',
      allowNull: true,
    },
    maintenanceInterventionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'maintenance_intervention_id',
      allowNull: true,
    },
    maintenancePartId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'maintenance_part_id',
      allowNull: true,
    },
    partUuid: { type: DataTypes.UUID, field: 'part_uuid', allowNull: false },
    partName: { type: DataTypes.STRING(150), field: 'part_name', allowNull: false },
    partReference: {
      type: DataTypes.STRING(150),
      field: 'part_reference',
      allowNull: false,
    },
    unit: { type: DataTypes.STRING(50), allowNull: false },
    quantity: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0.01, max: 1000000 },
    },
    unitPrice: { type: DataTypes.DECIMAL(12, 2), field: 'unit_price', allowNull: false },
    totalCost: { type: DataTypes.DECIMAL(14, 2), field: 'total_cost', allowNull: false },
    performedAt: { type: DataTypes.DATEONLY, field: 'performed_at', allowNull: false },
  },
  {
    sequelize,
    modelName: 'MaintenancePartUsage',
    tableName: 'maintenance_part_usages',
    updatedAt: false,
    paranoid: false,
    validate: {
      exactlyOneMaintenanceParent() {
        const hasHistory =
          this.maintenanceHistoryId !== null && this.maintenanceHistoryId !== undefined;
        const hasIntervention =
          this.maintenanceInterventionId !== null && this.maintenanceInterventionId !== undefined;
        if (hasHistory === hasIntervention) {
          throw new Error('A part usage must belong to exactly one maintenance record.');
        }
      },
    },
  },
);

export default MaintenancePartUsage;
