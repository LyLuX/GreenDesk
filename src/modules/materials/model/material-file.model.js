import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../config/database.js';
import { DOCUMENT_TYPES } from '../material-file.constants.js';
class MaterialFile extends Model {}
MaterialFile.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, defaultValue: uuidv4, unique: true, allowNull: false },
    companyId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'company_id' },
    materialId: { type: DataTypes.BIGINT.UNSIGNED, field: 'material_id', allowNull: false },
    kind: { type: DataTypes.ENUM('photo', 'document'), allowNull: false },
    documentType: {
      type: DataTypes.ENUM(...DOCUMENT_TYPES),
      field: 'document_type',
      allowNull: true,
    },
    name: { type: DataTypes.STRING(150), allowNull: true },
    originalName: { type: DataTypes.STRING(255), field: 'original_name', allowNull: false },
    fileName: { type: DataTypes.STRING(255), field: 'file_name', allowNull: false },
    mimeType: { type: DataTypes.STRING(100), field: 'mime_type', allowNull: false },
    size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    isPrimary: { type: DataTypes.BOOLEAN, field: 'is_primary', defaultValue: false },
  },
  { sequelize, modelName: 'MaterialFile', tableName: 'material_files', updatedAt: false },
);
export default MaterialFile;
