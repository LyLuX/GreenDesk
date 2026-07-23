import { jest } from '@jest/globals';
import MaintenanceService from '../src/modules/maintenance/service/maintenance.service.js';

describe('MaintenanceService', () => {
  const createService = () => new MaintenanceService({ findAll: jest.fn() }, {}, {});

  it('calculates both date and engine-hour deadlines', () => {
    expect(
      createService().calculateDeadlines({
        intervalDays: 30,
        intervalHours: 50,
        lastMaintenanceDate: '2026-07-01',
        lastEngineHours: 120,
      }),
    ).toEqual({ nextMaintenanceDate: '2026-07-31', nextEngineHours: 170 });
  });

  it('requires at least one positive interval', () => {
    expect(() => createService().calculateDeadlines({})).toThrow(
      'Au moins un intervalle doit être renseigné.',
    );
  });

  it('requires the relevant previous maintenance values', () => {
    expect(() => createService().calculateDeadlines({ intervalDays: 10 })).toThrow(
      'date du dernier entretien',
    );
    expect(() => createService().calculateDeadlines({ intervalHours: 10 })).toThrow(
      'heures du dernier entretien',
    );
  });
});
