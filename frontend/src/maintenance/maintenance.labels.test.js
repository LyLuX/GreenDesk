import { describe, expect, it } from 'vitest';
import { maintenancePriorityBadgeClasses } from './maintenance.labels.js';

describe('maintenance priority badge classes', () => {
  it('associates every priority level with its visual variant', () => {
    expect(maintenancePriorityBadgeClasses).toEqual({
      low: 'priority-low',
      normal: 'priority-normal',
      high: 'priority-high',
      critical: 'priority-critical',
    });
  });
});
