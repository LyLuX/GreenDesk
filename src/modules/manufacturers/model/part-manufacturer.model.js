import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import sequelize from '../../../config/database.js';

/** Global manufacturer shared by materials and exact maintenance parts. */
class PartManufacturer extends Model {}

PartManufacturer.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    logoFileName: { type: DataTypes.STRING(255), allowNull: true, field: 'logo_file_name' },
    logoOriginalName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'logo_original_name',
    },
    logoMimeType: { type: DataTypes.STRING(100), allowNull: true, field: 'logo_mime_type' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by', allowNull: true },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by', allowNull: true },
  },
  {
    sequelize,
    modelName: 'PartManufacturer',
    tableName: 'part_manufacturers',
    paranoid: true,
  },
);

export default PartManufacturer;
