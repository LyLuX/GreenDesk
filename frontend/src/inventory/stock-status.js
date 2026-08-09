export const STOCK_STATUSES = Object.freeze({
  IN_STOCK: 'inStock',
  TO_ORDER: 'toOrder',
  ORDERED: 'ordered',
});

export const stockStatusPresentation = Object.freeze({
  [STOCK_STATUSES.IN_STOCK]: Object.freeze({
    label: 'En stock atelier',
    badgeClass: 'stock-in-stock',
  }),
  [STOCK_STATUSES.TO_ORDER]: Object.freeze({
    label: 'À commander',
    badgeClass: 'stock-to-order',
  }),
  [STOCK_STATUSES.ORDERED]: Object.freeze({
    label: 'Commandée',
    badgeClass: 'stock-ordered',
  }),
});

export const stockStatusOptions = Object.entries(stockStatusPresentation).map(
  ([value, { label }]) => ({ value, label }),
);
