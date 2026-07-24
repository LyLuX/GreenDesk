import fs from 'node:fs/promises';
import path from 'node:path';

import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import logger from '../../../core/logger/logger.js';
import AuditService from '../../audit/service/audit.service.js';
import { BRAND_LOGO_MIME_TYPES } from '../brand-logo.constants.js';
import BrandRepository from '../repository/brand.repository.js';

const uploadDirectory = path.join(process.cwd(), 'uploads', 'brands');

/** Stores and serves the optional image associated with a brand. */
export default class BrandLogoService {
  constructor(repository = new BrandRepository(), auditService = new AuditService()) {
    this.repository = repository;
    this.auditService = auditService;
  }

  async add(brandUuid, file, userId) {
    if (!file) throw new AppError('Aucun logo fourni.', HTTP_STATUS.BAD_REQUEST);
    if (!BRAND_LOGO_MIME_TYPES.includes(file.mimetype)) {
      await this.safeDeletePhysicalFile(file.path);
      throw new AppError('Le format du logo est invalide.', HTTP_STATUS.BAD_REQUEST);
    }

    let persisted = false;
    try {
      const brand = await this.getBrand(brandUuid);
      const oldValues = brand.toJSON();
      const previousFileName = brand.logoFileName;
      const previousFilePath = previousFileName ? this.getPhysicalPath(previousFileName) : null;
      await this.repository.update(brand, {
        logoFileName: file.filename,
        logoOriginalName: file.originalname,
        logoMimeType: file.mimetype,
        updatedBy: userId,
      });
      persisted = true;
      if (previousFilePath && previousFileName !== file.filename) {
        await this.safeDeletePhysicalFile(previousFilePath);
      }
      await this.auditService.record({
        userId,
        action: 'UPDATE',
        entity: 'BRAND',
        entityUuid: brand.uuid,
        oldValues,
        newValues: brand.toJSON(),
      });
      return { hasLogo: true };
    } catch (error) {
      if (!persisted) await this.safeDeletePhysicalFile(file.path);
      throw error;
    }
  }

  async remove(brandUuid, userId) {
    const brand = await this.getBrand(brandUuid);
    if (!brand.logoFileName) return { hasLogo: false };
    const oldValues = brand.toJSON();
    const filePath = this.getPhysicalPath(brand.logoFileName);
    await this.repository.update(brand, {
      logoFileName: null,
      logoOriginalName: null,
      logoMimeType: null,
      updatedBy: userId,
    });
    await this.safeDeletePhysicalFile(filePath);
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entity: 'BRAND',
      entityUuid: brand.uuid,
      oldValues,
      newValues: brand.toJSON(),
    });
    return { hasLogo: false };
  }

  async getForContent(brandUuid) {
    const brand = await this.getBrand(brandUuid);
    if (!brand.logoFileName || !brand.logoMimeType) {
      throw new AppError('Cette marque ne possède pas de logo.', HTTP_STATUS.NOT_FOUND);
    }
    const filePath = this.getPhysicalPath(brand.logoFileName);
    try {
      await fs.access(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new AppError('Le fichier du logo est introuvable.', HTTP_STATUS.NOT_FOUND);
      }
      throw error;
    }
    return { filePath, mimeType: brand.logoMimeType };
  }

  async getBrand(uuid) {
    const brand = await this.repository.findByUuid(uuid);
    if (!brand) throw new AppError('Marque introuvable.', HTTP_STATUS.NOT_FOUND);
    return brand;
  }

  getPhysicalPath(fileName) {
    const filePath = path.resolve(uploadDirectory, fileName);
    if (!filePath.startsWith(`${path.resolve(uploadDirectory)}${path.sep}`)) {
      throw new AppError('Nom de fichier invalide.', HTTP_STATUS.BAD_REQUEST);
    }
    return filePath;
  }

  async safeDeletePhysicalFile(filePath) {
    if (!filePath) return false;
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      logger.error('Unable to delete brand logo', { error, filePath });
      return false;
    }
  }
}
