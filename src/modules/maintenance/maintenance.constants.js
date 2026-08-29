export const MAINTENANCE_TYPES = Object.freeze([
  'preventive',
  'inspection',
  'replacement',
  'lubrication',
  'cleaning',
  'custom',
]);

export const MAINTENANCE_PRIORITIES = Object.freeze(['low', 'normal', 'high', 'critical']);

export const MAINTENANCE_DEADLINE_STATUSES = Object.freeze([
  'upToDate',
  'upcoming',
  'dueToday',
  'overdue',
  'wearBased',
]);

export const MAINTENANCE_PART_ACTIONS = Object.freeze({
  CONSUME: 'consume',
  PARTIAL: 'partial',
  SKIP: 'skip',
});

export const MAINTENANCE_EXECUTION_TYPES = Object.freeze({
  STANDARD: 'standard',
  PARTIAL_PART_REPLACEMENT: 'partialPartReplacement',
  WITHOUT_PART_REPLACEMENT: 'withoutPartReplacement',
});
