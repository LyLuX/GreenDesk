import fs from 'node:fs/promises';
import path from 'node:path';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import logger from '../../../core/logger/logger.js';
import MaterialFileRepository from '../repository/material-file.repository.js';
import { DOCUMENT_TYPES, PHOTO_MIME_TYPES } from '../material-file.constants.js';
import MaterialService from './material.service.js';
export default class MaterialFileService {
  constructor(repository = new MaterialFileRepository(), materialService = new MaterialService()) {
    this.repository = repository;
    this.materialService = materialService;
  }
  async add(materialUuid, file, kind, documentType) {
    try {
      if (!file) throw new AppError('Aucun fichier fourni.', HTTP_STATUS.BAD_REQUEST);
      if (kind === 'photo' && !PHOTO_MIME_TYPES.includes(file.mimetype))
        throw new AppError('Le type de photo est invalide.', HTTP_STATUS.BAD_REQUEST);
      if (kind === 'document' && !DOCUMENT_TYPES.includes(documentType))
        throw new AppError('Le type de document est invalide.', HTTP_STATUS.BAD_REQUEST);
      const material = await this.materialService.getEntityByUuid(materialUuid);
      if (kind === 'photo' && (await this.repository.countPhotos(material.id)) >= 10)
        throw new AppError('Un matériel ne peut contenir que 10 photos.', HTTP_STATUS.BAD_REQUEST);
      return this.toPublic(
        await this.repository.create({
          materialId: material.id,
          kind,
          documentType: documentType ?? null,
          originalName: file.originalname,
          fileName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
        }),
      );
    } catch (error) {
      if (file?.path) await this.safeDeletePhysicalFile(file.path);
      throw error;
    }
  }
  async remove(uuid) {
    const file = await this.repository.findByUuid(uuid);
    if (!file) throw new AppError('Fichier introuvable.', HTTP_STATUS.NOT_FOUND);
    await this.safeDeletePhysicalFile(this.getPhysicalPath(file.fileName));
    await this.repository.remove(file);
  }
  async setPrimary(uuid) {
    const file = await this.repository.findByUuid(uuid);
    if (!file || file.kind !== 'photo')
      throw new AppError('Photo not found', HTTP_STATUS.NOT_FOUND);
    return this.toPublic(await this.repository.setPrimary(file));
  }
  async getForDownload(uuid) {
    const file = await this.repository.findByUuid(uuid);
    if (!file) throw new AppError('Fichier introuvable.', HTTP_STATUS.NOT_FOUND);
    await this.assertPhysicalFileExists(file);
    return file;
  }
  async getForContent(uuid) {
    const file = await this.getForDownload(uuid);
    if (file.kind !== 'photo')
      throw new AppError('Cette ressource n’est pas une photo.', HTTP_STATUS.BAD_REQUEST);
    return file;
  }
  getPhysicalPath(fileName) {
    const directory = path.join(process.cwd(), 'uploads', 'materials');
    const filePath = path.resolve(directory, fileName);
    if (!filePath.startsWith(`${path.resolve(directory)}${path.sep}`))
      throw new AppError('Nom de fichier invalide.', HTTP_STATUS.BAD_REQUEST);
    return filePath;
  }
  async assertPhysicalFileExists(file) {
    try {
      await fs.access(this.getPhysicalPath(file.fileName));
    } catch (error) {
      if (error.code === 'ENOENT')
        throw new AppError('Le fichier physique est introuvable.', HTTP_STATUS.NOT_FOUND);
      logger.error('Unable to access material file', { error, fileUuid: file.uuid });
      throw new AppError('Impossible d’accéder au fichier.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }
  async safeDeletePhysicalFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn('Material file was already missing from disk', { filePath });
        return false;
      }
      logger.error('Unable to delete material file', { error, filePath });
      throw new AppError(
        'Impossible de supprimer le fichier physique.',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
  }
  toPublic(file) {
    const value = typeof file.toJSON === 'function' ? file.toJSON() : file;
    const publicFile = { ...value };
    delete publicFile.id;
    delete publicFile.materialId;
    return publicFile;
  }
}
