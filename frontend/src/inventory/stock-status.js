export const STOCK_STATUSES = Object.freeze({
  IN_STOCK: 'inStock',
  TO_ORDER: 'toOrder',
  ORDERED: 'ordered',
});

export const stockStatusPresentation = Object.freeze({
  [STOCK_STATUSES.IN_STOCK]: Object.freeze({
    label: 'En stock',
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

/** Formats a stock quantity with the part unit and its common French plural. */
export const formatStockQuantity = (quantity, unit) => {
  const numericQuantity = Number(quantity);
  const normalizedUnit = String(unit ?? '').trim();
  const displayedUnit =
    numericQuantity > 1 && normalizedUnit.toLocaleLowerCase('fr') === 'pièce'
      ? 'pièces'
      : normalizedUnit;
  return `${numericQuantity.toLocaleString('fr-FR')} ${displayedUnit}`.trim();
};
