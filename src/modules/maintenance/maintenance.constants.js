export const MAINTENANCE_TYPES = Object.freeze([
  'preventive',
  'inspection',
  'replacement',
  'lubrication',
  'cleaning',
  'custom',
]);

export const MAINTENANCE_PRIORITIES = Object.freeze(['low', 'normal', 'high', 'critical']);

export const MAINTENANCE_PART_ACTIONS = Object.freeze({
  CONSUME: 'consume',
  SKIP: 'skip',
});

export const MAINTENANCE_EXECUTION_TYPES = Object.freeze({
  STANDARD: 'standard',
  WITHOUT_PART_REPLACEMENT: 'withoutPartReplacement',
});
