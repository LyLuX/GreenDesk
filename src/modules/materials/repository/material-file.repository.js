import MaterialFile from '../model/material-file.model.js';
import CompanyScopedRepository from '../../../core/database/repositories/company-scoped.repository.js';
import {
  requireCompanyInstance,
  companyValues,
  companyWhere,
} from '../../../core/company/company-context.js';
export default class MaterialFileRepository extends CompanyScopedRepository {
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
    requireCompanyInstance(file);
    return file.destroy({ transaction });
  }
  async setPrimary(file) {
    requireCompanyInstance(file);
    return this.withTransaction(async (transaction) => {
      await MaterialFile.update(
        { isPrimary: false },
        {
          where: companyWhere({ materialId: file.materialId, kind: 'photo' }),
          transaction,
        },
      );
      requireCompanyInstance(file);
      return file.update({ isPrimary: true }, { transaction });
    });
  }
}
