import MaterialFile from '../model/material-file.model.js';
import { withTransaction } from '../../../core/database/transaction-context.js';
export default class MaterialFileRepository {
  async create(values) {
    return MaterialFile.create(values);
  }
  async findByUuid(uuid) {
    return MaterialFile.findOne({ where: { uuid } });
  }
  async countPhotos(materialId) {
    return MaterialFile.count({ where: { materialId, kind: 'photo' } });
  }
  async remove(file) {
    return file.destroy();
  }
  async setPrimary(file) {
    return withTransaction(async (transaction) => {
      await MaterialFile.update(
        { isPrimary: false },
        { where: { materialId: file.materialId, kind: 'photo' }, transaction },
      );
      return file.update({ isPrimary: true }, { transaction });
    });
  }
}
