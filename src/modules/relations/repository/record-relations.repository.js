import { companyWhere, requireCompanyScope } from '../../../core/company/company-context.js';
import Category from '../../categories/model/category.model.js';
import Company from '../../companies/model/company.model.js';
import PartManufacturer from '../../manufacturers/model/part-manufacturer.model.js';
import MaintenanceOperation from '../../maintenance/model/maintenance-operation.model.js';
import MaintenancePart from '../../maintenance/model/maintenance-part.model.js';
import MaintenanceTask from '../../maintenance/model/maintenance-task.model.js';
import MaintenanceTaskPart from '../../maintenance/model/maintenance-task-part.model.js';
import MaterialFile from '../../materials/model/material-file.model.js';
import Material from '../../materials/model/material.model.js';
import Supplier from '../../suppliers/model/supplier.model.js';

const toPlain = (record) =>
  typeof record?.toJSON === 'function' ? record.toJSON() : { ...record };
const scopedRecords = (model, attributes, options = {}) =>
  model.findAll({
    attributes,
    where: companyWhere(),
    order: options.order ?? [['id', 'ASC']],
  });

/** Loads the actual fleet and maintenance records shown in the relationship graph. */
export default class RecordRelationsRepository {
  async getCompany() {
    const { companyId } = requireCompanyScope();
    return Company.findByPk(companyId, { attributes: ['uuid', 'name'] });
  }

  async getRecords(keys) {
    requireCompanyScope();
    const loaders = {
      categories: () => scopedRecords(Category, ['id', 'uuid', 'name']),
      manufacturers: () => scopedRecords(PartManufacturer, ['id', 'uuid', 'name']),
      suppliers: () => scopedRecords(Supplier, ['id', 'uuid', 'name']),
      materials: () =>
        scopedRecords(Material, [
          'id',
          'uuid',
          'name',
          'model',
          'serialNumber',
          'categoryId',
          'manufacturerId',
        ]),
      plans: () =>
        scopedRecords(MaintenanceTask, [
          'id',
          'uuid',
          'title',
          'maintenanceType',
          'materialId',
          'operationId',
        ]),
      operations: () =>
        scopedRecords(MaintenanceOperation, ['id', 'uuid', 'name', 'maintenanceType']),
      parts: () =>
        scopedRecords(MaintenancePart, [
          'id',
          'uuid',
          'name',
          'reference',
          'unit',
          'manufacturerId',
          'supplierId',
        ]),
      taskParts: () =>
        scopedRecords(MaintenanceTaskPart, ['maintenanceTaskId', 'maintenancePartId', 'quantity'], {
          order: [
            ['maintenanceTaskId', 'ASC'],
            ['maintenancePartId', 'ASC'],
          ],
        }),
      materialFiles: () =>
        scopedRecords(MaterialFile, ['id', 'uuid', 'materialId', 'originalName', 'kind']),
    };

    const entries = await Promise.all(
      keys.map(async (key) => [key, (await loaders[key]()).map(toPlain)]),
    );
    return Object.fromEntries(entries);
  }
}
