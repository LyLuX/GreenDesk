import fs from 'node:fs/promises';
import path from 'node:path';

import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import logger from '../../../core/logger/logger.js';
import AuditService from '../../audit/service/audit.service.js';
import { COMPANY_LOGO_MIME_TYPES } from '../company-logo.constants.js';
import companyPermissions from '../company.permissions.js';
import CompanyRepository from '../repository/company.repository.js';

const uploadDirectory = path.join(process.cwd(), 'uploads', 'companies');

/** Stores and serves the optional image associated with an accessible company. */
export default class CompanyLogoService {
  constructor(repository = new CompanyRepository(), auditService = new AuditService()) {
    this.repository = repository;
    this.auditService = auditService;
  }

  async add(companyUuid, file, userId, claims) {
    if (!file) throw new AppError('Aucun logo fourni.', HTTP_STATUS.BAD_REQUEST);
    if (!COMPANY_LOGO_MIME_TYPES.includes(file.mimetype)) {
      await this.safeDeletePhysicalFile(file.path);
      throw new AppError('Le format du logo est invalide.', HTTP_STATUS.BAD_REQUEST);
    }

    let persisted = false;
    try {
      const company = await this.getCompany(companyUuid, claims);
      const oldValues = company.toJSON();
      const previousFileName = company.logoFileName;
      const previousFilePath = previousFileName ? this.getPhysicalPath(previousFileName) : null;
      await this.repository.withTransaction(async (transaction) => {
        await this.repository.update(
          company,
          {
            logoFileName: file.filename,
            logoOriginalName: file.originalname,
            logoMimeType: file.mimetype,
          },
          { transaction },
        );
        await this.auditService.record(
          {
            companyId: company.id,
            userId,
            action: 'UPDATE',
            entity: 'COMPANY',
            entityUuid: company.uuid,
            oldValues,
            newValues: company.toJSON(),
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

  async remove(companyUuid, userId, claims) {
    const company = await this.getCompany(companyUuid, claims);
    if (!company.logoFileName) return { hasLogo: false };
    const oldValues = company.toJSON();
    const filePath = this.getPhysicalPath(company.logoFileName);
    await this.repository.withTransaction(async (transaction) => {
      await this.repository.update(
        company,
        { logoFileName: null, logoOriginalName: null, logoMimeType: null },
        { transaction },
      );
      await this.auditService.record(
        {
          companyId: company.id,
          userId,
          action: 'UPDATE',
          entity: 'COMPANY',
          entityUuid: company.uuid,
          oldValues,
          newValues: company.toJSON(),
        },
        { transaction },
      );
    });
    await this.safeDeletePhysicalFile(filePath);
    return { hasLogo: false };
  }

  async getForContent(companyUuid, claims) {
    const company = await this.getCompany(companyUuid, claims, { withDeleted: true });
    if (!company.logoFileName || !company.logoMimeType) {
      throw new AppError('Cette société ne possède pas de logo.', HTTP_STATUS.NOT_FOUND);
    }
    return {
      filePath: this.getPhysicalPath(company.logoFileName),
      mimeType: company.logoMimeType,
    };
  }

  async getCompany(uuid, claims, { withDeleted = false } = {}) {
    const company = await this.repository.findByUuid(uuid, { withDeleted });
    if (!company) throw new AppError('Société introuvable.', HTTP_STATUS.NOT_FOUND);
    await this.assertAccessible(company, claims);
    return company;
  }

  async assertAccessible(company, claims) {
    if (!claims) return;
    if (claims.permissions?.includes(companyPermissions.accessAll)) return;
    if ((claims.companyAccess ?? []).some(({ uuid }) => uuid === company.uuid)) return;
    if (claims.userId && (await this.repository.hasUserAssignment(company.id, claims.userId))) {
      return;
    }
    throw new AppError('Société introuvable.', HTTP_STATUS.NOT_FOUND);
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
      logger.error('Unable to delete company logo', { error, filePath });
      return false;
    }
  }
}
