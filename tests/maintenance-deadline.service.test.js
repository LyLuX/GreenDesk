import {
  addDaysDateOnly,
  differenceInDays,
  getDeadlineDetails,
  todayDateOnly,
} from '../src/modules/maintenance/service/maintenance-deadline.service.js';

describe('maintenance deadline rules', () => {
  const today = '2026-07-24';
  it('calculates calendar deadlines without a timezone drift', () => {
    expect(addDaysDateOnly('2026-02-28', 1)).toBe('2026-03-01');
    expect(differenceInDays('2026-07-24', '2026-08-01')).toBe(8);
    expect(todayDateOnly(new Date('2026-07-24T23:59:00.000Z'))).toBe(today);
  });
  it('marks a task overdue when the date deadline is reached', () => {
    expect(getDeadlineDetails({ nextMaintenanceDate: today, today })).toMatchObject({
      status: 'overdue',
      dateStatus: 'overdue',
      remainingDays: 0,
    });
  });
  it('marks a task upcoming with an approaching engine-hour threshold', () => {
    expect(
      getDeadlineDetails({
        nextEngineHours: 100,
        materialEngineHours: 85,
        intervalHours: 100,
        today,
      }),
    ).toMatchObject({
      status: 'upcoming',
      engineHoursStatus: 'upcoming',
      remainingEngineHours: 15,
      engineHoursUpcomingThreshold: 20,
    });
  });
  it('marks a task overdue when its engine hours are reached even when date is current', () => {
    expect(
      getDeadlineDetails({
        nextMaintenanceDate: '2026-12-01',
        nextEngineHours: 100,
        materialEngineHours: 101,
        intervalHours: 50,
        today,
      }),
    ).toMatchObject({ status: 'overdue', dateStatus: 'upToDate', engineHoursStatus: 'overdue' });
  });
});
