import { jest } from '@jest/globals';
import MaintenanceTemplateService from '../src/modules/maintenance/service/maintenance-template.service.js';

describe('MaintenanceTemplateService', () => {
  it('derives compatibility from the selected material and keeps its specific reference', async () => {
    const template = {
      id: 7,
      uuid: '11111111-1111-4111-8111-111111111111',
      brandId: 2,
      materialModel: 'CS-621SX',
      title: 'Bougie',
      partReference: 'BPMR8Y',
      toJSON() {
        return { ...this };
      },
    };
    const repository = {
      findDuplicate: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(template),
      findByUuid: jest.fn().mockResolvedValue({
        ...template,
        brand: {
          uuid: '22222222-2222-4222-8222-222222222222',
          name: 'ECHO',
        },
      }),
    };
    const materialService = {
      getEntityByUuid: jest.fn().mockResolvedValue({
        id: 3,
        brandId: 2,
        model: 'CS-621SX',
      }),
    };
    const auditService = { record: jest.fn() };
    const service = new MaintenanceTemplateService(repository, materialService, auditService);

    const result = await service.create(
      {
        materialUuid: '33333333-3333-4333-8333-333333333333',
        title: 'Bougie',
        maintenanceType: 'replacement',
        intervalDays: 365,
        priority: 'normal',
        partReference: 'BPMR8Y',
        quantity: 1,
      },
      42,
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 2,
        materialModel: 'CS-621SX',
        partReference: 'BPMR8Y',
        createdBy: 42,
        updatedBy: 42,
      }),
    );
    expect(result).toMatchObject({
      uuid: template.uuid,
      materialModel: 'CS-621SX',
      partReference: 'BPMR8Y',
      brand: { name: 'ECHO' },
    });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('brandId');
  });

  it('matches templates only with the exact brand and material model', () => {
    const service = new MaintenanceTemplateService({}, {}, {});
    const template = { brandId: 2, materialModel: 'CS-621SX' };

    expect(service.isCompatible(template, { brandId: 2, model: 'cs-621sx' })).toBe(true);
    expect(service.isCompatible(template, { brandId: 3, model: 'CS-621SX' })).toBe(false);
    expect(service.isCompatible(template, { brandId: 2, model: 'EP-534 THX' })).toBe(false);
  });

  it('recalculates assigned deadlines transactionally when the interval changes', async () => {
    const template = {
      id: 7,
      uuid: '11111111-1111-4111-8111-111111111111',
      brandId: 2,
      materialModel: 'CS-621SX',
      title: 'Bougie',
      intervalDays: 365,
      toJSON() {
        return {
          id: this.id,
          uuid: this.uuid,
          brandId: this.brandId,
          materialModel: this.materialModel,
          title: this.title,
          intervalDays: this.intervalDays,
        };
      },
    };
    const transaction = { id: 'transaction' };
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(template),
      findDuplicate: jest.fn().mockResolvedValue(null),
      withTransaction: jest.fn((callback) => callback(transaction)),
      update: jest.fn((_template, values) => Object.assign(template, values)),
      updateAssignmentDeadlines: jest.fn(),
    };
    const service = new MaintenanceTemplateService(repository, {}, { record: jest.fn() });

    await service.update(template.uuid, { intervalDays: 180 }, 42);

    expect(repository.update).toHaveBeenCalledWith(
      template,
      { intervalDays: 180, updatedBy: 42 },
      { transaction },
    );
    expect(repository.updateAssignmentDeadlines).toHaveBeenCalledWith(
      template.id,
      expect.any(Function),
      { transaction },
    );
    const calculate = repository.updateAssignmentDeadlines.mock.calls[0][1];
    expect(calculate('2026-01-01')).toBe('2026-06-30');
  });
});
