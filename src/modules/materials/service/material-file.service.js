import fs from 'node:fs/promises';
import path from 'node:path';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import MaterialFileRepository from '../repository/material-file.repository.js';
import MaterialService from './material.service.js';
export default class MaterialFileService {
  constructor(repository = new MaterialFileRepository(), materialService = new MaterialService()) {
    this.repository = repository;
    this.materialService = materialService;
  }
  async add(materialUuid, file, kind, documentType) {
    const material = await this.materialService.getByUuid(materialUuid);
    if (kind === 'photo' && (await this.repository.countPhotos(material.id)) >= 10)
      throw new AppError('A material can have at most 10 photos', HTTP_STATUS.BAD_REQUEST);
    return this.repository.create({
      materialId: material.id,
      kind,
      documentType: documentType ?? null,
      originalName: file.originalname,
      fileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    });
  }
  async remove(uuid) {
    const file = await this.repository.findByUuid(uuid);
    if (!file) throw new AppError('File not found', HTTP_STATUS.NOT_FOUND);
    await fs
      .unlink(path.join(process.cwd(), 'uploads', 'materials', file.fileName))
      .catch(() => {});
    await this.repository.remove(file);
  }
  async setPrimary(uuid) {
    const file = await this.repository.findByUuid(uuid);
    if (!file || file.kind !== 'photo')
      throw new AppError('Photo not found', HTTP_STATUS.NOT_FOUND);
    return this.repository.setPrimary(file);
  }
}
