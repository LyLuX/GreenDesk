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
  it('distinguishes a task due today from an overdue task', () => {
    expect(getDeadlineDetails({ nextMaintenanceDate: today, today })).toMatchObject({
      status: 'dueToday',
      remainingDays: 0,
    });
    expect(getDeadlineDetails({ nextMaintenanceDate: '2026-07-23', today })).toMatchObject({
      status: 'overdue',
      remainingDays: -1,
    });
  });
  it('distinguishes an upcoming task from a later task', () => {
    expect(getDeadlineDetails({ nextMaintenanceDate: '2026-08-20', today })).toMatchObject({
      status: 'upcoming',
      remainingDays: 27,
    });
    expect(getDeadlineDetails({ nextMaintenanceDate: '2026-09-01', today })).toMatchObject({
      status: 'upToDate',
      remainingDays: 39,
    });
  });
});
