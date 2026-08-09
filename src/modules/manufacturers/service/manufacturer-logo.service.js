import fs from 'node:fs/promises';
import path from 'node:path';

import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import logger from '../../../core/logger/logger.js';
import AuditService from '../../audit/service/audit.service.js';
import { MANUFACTURER_LOGO_MIME_TYPES } from '../manufacturer-logo.constants.js';
import ManufacturerRepository from '../repository/manufacturer.repository.js';

const uploadDirectory = path.join(process.cwd(), 'uploads', 'manufacturers');
const legacyUploadDirectory = path.join(process.cwd(), 'uploads', 'brands');

/** Stores and serves the optional image associated with a manufacturer. */
export default class ManufacturerLogoService {
  constructor(repository = new ManufacturerRepository(), auditService = new AuditService()) {
    this.repository = repository;
    this.auditService = auditService;
  }

  async add(manufacturerUuid, file, userId) {
    if (!file) throw new AppError('Aucun logo fourni.', HTTP_STATUS.BAD_REQUEST);
    if (!MANUFACTURER_LOGO_MIME_TYPES.includes(file.mimetype)) {
      await this.safeDeletePhysicalFile(file.path);
      throw new AppError('Le format du logo est invalide.', HTTP_STATUS.BAD_REQUEST);
    }

    let persisted = false;
    try {
      const manufacturer = await this.getManufacturer(manufacturerUuid);
      const oldValues = manufacturer.toJSON();
      const previousFileName = manufacturer.logoFileName;
      const previousFilePath = previousFileName ? this.getPhysicalPath(previousFileName) : null;
      await this.repository.withTransaction(async (transaction) => {
        await this.repository.update(
          manufacturer,
          {
            logoFileName: file.filename,
            logoOriginalName: file.originalname,
            logoMimeType: file.mimetype,
            updatedBy: userId,
          },
          { transaction },
        );
        await this.auditService.record(
          {
            userId,
            action: 'UPDATE',
            entity: 'MANUFACTURER',
            entityUuid: manufacturer.uuid,
            oldValues,
            newValues: manufacturer.toJSON(),
          },
          { transaction },
        );
      });
      persisted = true;
      if (previousFilePath && previousFileName !== file.filename) {
        await this.safeDeletePhysicalFile(previousFilePath);
      }
      return { hasLogo: true };
    } catch (error) {
      if (!persisted) await this.safeDeletePhysicalFile(file.path);
      throw error;
    }
  }

  async remove(manufacturerUuid, userId) {
    const manufacturer = await this.getManufacturer(manufacturerUuid);
    if (!manufacturer.logoFileName) return { hasLogo: false };
    const oldValues = manufacturer.toJSON();
    const filePath = await this.findPhysicalPath(manufacturer.logoFileName);
    await this.repository.withTransaction(async (transaction) => {
      await this.repository.update(
        manufacturer,
        {
          logoFileName: null,
          logoOriginalName: null,
          logoMimeType: null,
          updatedBy: userId,
        },
        { transaction },
      );
      await this.auditService.record(
        {
          userId,
          action: 'UPDATE',
          entity: 'MANUFACTURER',
          entityUuid: manufacturer.uuid,
          oldValues,
          newValues: manufacturer.toJSON(),
        },
        { transaction },
      );
    });
    await this.safeDeletePhysicalFile(filePath);
    return { hasLogo: false };
  }

  async getForContent(manufacturerUuid) {
    const manufacturer = await this.getManufacturer(manufacturerUuid);
    if (!manufacturer.logoFileName || !manufacturer.logoMimeType) {
      throw new AppError('Ce fabricant ne possède pas de logo.', HTTP_STATUS.NOT_FOUND);
    }
    const filePath = await this.findPhysicalPath(manufacturer.logoFileName);
    return { filePath, mimeType: manufacturer.logoMimeType };
  }

  async getManufacturer(uuid) {
    const manufacturer = await this.repository.findByUuid(uuid);
    if (!manufacturer) throw new AppError('Fabricant introuvable.', HTTP_STATUS.NOT_FOUND);
    return manufacturer;
  }

  getPhysicalPath(fileName, directory = uploadDirectory) {
    const filePath = path.resolve(directory, fileName);
    if (!filePath.startsWith(`${path.resolve(directory)}${path.sep}`)) {
      throw new AppError('Nom de fichier invalide.', HTTP_STATUS.BAD_REQUEST);
    }
    return filePath;
  }

  async findPhysicalPath(fileName) {
    for (const directory of [uploadDirectory, legacyUploadDirectory]) {
      const filePath = this.getPhysicalPath(fileName, directory);
      try {
        await fs.access(filePath);
        return filePath;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    throw new AppError('Le fichier du logo est introuvable.', HTTP_STATUS.NOT_FOUND);
  }

  async safeDeletePhysicalFile(filePath) {
    if (!filePath) return false;
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      logger.error('Unable to delete manufacturer logo', { error, filePath });
      return false;
    }
  }
}
