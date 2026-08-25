import MaterialFile from '../model/material-file.model.js';
import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import { companyValues, companyWhere } from '../../../core/company/company-context.js';
export default class MaterialFileRepository extends TransactionalRepository {
  async create(values, { transaction } = {}) {
    return MaterialFile.create(companyValues(values), { transaction });
  }
  async findByUuid(uuid) {
    return MaterialFile.findOne({ where: companyWhere({ uuid }) });
  }
  async countPhotos(materialId) {
    return MaterialFile.count({ where: companyWhere({ materialId, kind: 'photo' }) });
  }
  async remove(file, { transaction } = {}) {
    return file.destroy({ transaction });
  }
  async setPrimary(file) {
    return this.withTransaction(async (transaction) => {
      await MaterialFile.update(
        { isPrimary: false },
        {
          where: companyWhere({ materialId: file.materialId, kind: 'photo' }),
          transaction,
        },
      );
      return file.update({ isPrimary: true }, { transaction });
    });
  }
}
