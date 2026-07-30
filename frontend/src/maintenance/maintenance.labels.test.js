import { describe, expect, it } from 'vitest';
import { maintenancePriorityBadgeClasses, maintenanceStatusClasses } from './maintenance.labels.js';

describe('maintenance priority badge classes', () => {
  it('associates every priority level with its visual variant', () => {
    expect(maintenancePriorityBadgeClasses).toEqual({
      low: 'priority-low',
      normal: 'priority-normal',
      high: 'priority-high',
      critical: 'priority-critical',
    });
  });

  it('associates every deadline status with its visual variant', () => {
    expect(maintenanceStatusClasses).toEqual({
      upToDate: '',
      upcoming: 'maintenance-upcoming',
      dueToday: 'maintenance-due-today',
      overdue: 'maintenance-overdue',
    });
  });
});
