export const STOCK_STATUSES = Object.freeze({
  IN_STOCK: 'inStock',
  TO_ORDER: 'toOrder',
  ORDERED: 'ordered',
});

export const STOCK_STATUS_VALUES = Object.freeze(Object.values(STOCK_STATUSES));

export const isStockStatus = (value) => STOCK_STATUS_VALUES.includes(value);
