export const STOCK_OPERATIONS = Object.freeze({
  ADJUST: 'adjust',
  ORDER: 'order',
  RECEIVE: 'receive',
  CONSUME: 'consume',
  MIGRATE: 'migrate',
});

export const STOCK_OPERATION_VALUES = Object.freeze(Object.values(STOCK_OPERATIONS));
export const PUBLIC_STOCK_OPERATION_VALUES = Object.freeze([
  STOCK_OPERATIONS.ADJUST,
  STOCK_OPERATIONS.ORDER,
  STOCK_OPERATIONS.RECEIVE,
]);

export const STOCKABLE_TYPES = Object.freeze({
  MAINTENANCE_PART: 'maintenancePart',
});

export const MAX_STOCK_QUANTITY = 1000000;
