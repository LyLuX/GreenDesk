import { jest } from '@jest/globals';

import CompanyLogoService from '../src/modules/companies/service/company-logo.service.js';

const transaction = { id: 'transaction' };
const companyModel = (values) => ({
  ...values,
  toJSON() {
    return { ...this };
  },
});

describe('CompanyLogoService', () => {
  it('replaces the logo for an accessible company and removes the previous file', async () => {
    const company = companyModel({
      id: 3,
      uuid: 'company-uuid',
      logoFileName: 'old.png',
      logoOriginalName: 'old.png',
      logoMimeType: 'image/png',
    });
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(company),
      update: jest.fn().mockImplementation(async (item, values) => Object.assign(item, values)),
      withTransaction: jest.fn((callback) => callback(transaction)),
      hasUserAssignment: jest.fn(),
    };
    const auditService = { record: jest.fn() };
    const service = new CompanyLogoService(repository, auditService);
    service.safeDeletePhysicalFile = jest.fn().mockResolvedValue(true);
    const file = {
      filename: 'new.webp',
      originalname: 'logo.webp',
      mimetype: 'image/webp',
      path: 'uploads/companies/new.webp',
    };

    await expect(
      service.add(company.uuid, file, 7, {
        userId: 7,
        permissions: [],
        companyAccess: [{ uuid: company.uuid }],
      }),
    ).resolves.toEqual({ hasLogo: true });

    expect(repository.update).toHaveBeenCalledWith(
      company,
      expect.objectContaining({
        logoFileName: 'new.webp',
        logoOriginalName: 'logo.webp',
        logoMimeType: 'image/webp',
      }),
      { transaction },
    );
    expect(service.safeDeletePhysicalFile).toHaveBeenCalledWith(
      expect.stringMatching(/uploads[\\/]companies[\\/]old\.png$/),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: company.id,
        entity: 'COMPANY',
        entityUuid: company.uuid,
      }),
      { transaction },
    );
  });

  it('accepts a freshly assigned company before the access token is refreshed', async () => {
    const company = companyModel({ id: 3, uuid: 'company-uuid', logoFileName: null });
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(company),
      hasUserAssignment: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockImplementation(async (item, values) => Object.assign(item, values)),
      withTransaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new CompanyLogoService(repository, { record: jest.fn() });
    service.safeDeletePhysicalFile = jest.fn().mockResolvedValue(true);

    await service.add(
      company.uuid,
      {
        filename: 'new.png',
        originalname: 'new.png',
        mimetype: 'image/png',
        path: 'uploads/companies/new.png',
      },
      7,
      { userId: 7, permissions: [], companyAccess: [] },
    );

    expect(repository.hasUserAssignment).toHaveBeenCalledWith(company.id, 7);
  });

  it('hides a company outside the authenticated user access perimeter', async () => {
    const company = companyModel({ id: 3, uuid: 'company-uuid', logoFileName: null });
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(company),
      hasUserAssignment: jest.fn().mockResolvedValue(false),
    };
    const service = new CompanyLogoService(repository, { record: jest.fn() });

    await expect(
      service.getForContent(company.uuid, {
        userId: 7,
        permissions: [],
        companyAccess: [],
      }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Société introuvable.' });
    expect(repository.findByUuid).toHaveBeenCalledWith(company.uuid, { withDeleted: true });
  });
});
