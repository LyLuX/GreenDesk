import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import BrandRepository from '../repository/brand.repository.js';
export default class BrandService {
  constructor(repository = new BrandRepository()) {
    this.repository = repository;
  }
  async getAll(search) {
    return this.repository.findAll(search);
  }
  async getByUuid(uuid) {
    const item = await this.repository.findByUuid(uuid);
    if (!item) throw new AppError('Brand not found', HTTP_STATUS.NOT_FOUND);
    return item;
  }
  async create(values, userId) {
    if (await this.repository.findByName(values.name))
      throw new AppError('Brand name is already in use', HTTP_STATUS.CONFLICT);
    return this.repository.create({ ...values, createdBy: userId, updatedBy: userId });
  }
  async update(uuid, values, userId) {
    const item = await this.getByUuid(uuid);
    await this.repository.update(item, { ...values, updatedBy: userId });
    return item;
  }
  async changeStatus(uuid, active, userId) {
    const item = await this.getByUuid(uuid);
    await this.repository.update(item, { active, updatedBy: userId });
    return item;
  }
}
