export const STOCK_STATUSES = Object.freeze({
  IN_STOCK: 'inStock',
  TO_ORDER: 'toOrder',
  ORDERED: 'ordered',
});

export const STOCK_STATUS_VALUES = Object.freeze(Object.values(STOCK_STATUSES));

export const isStockStatus = (value) => STOCK_STATUS_VALUES.includes(value);

/** Calculates the user-facing state and shortage for a concrete requirement. */
export const getStockAvailability = (
  { quantityOnHand = 0, quantityOnOrder = 0 } = {},
  requiredQuantity = 1,
) => {
  const required = Math.max(Number(requiredQuantity) || 0, 0);
  const onHand = Math.max(Number(quantityOnHand) || 0, 0);
  const onOrder = Math.max(Number(quantityOnOrder) || 0, 0);
  const shortage = Math.max(required - onHand - onOrder, 0);
  const status = shortage
    ? STOCK_STATUSES.TO_ORDER
    : onHand >= required
      ? STOCK_STATUSES.IN_STOCK
      : STOCK_STATUSES.ORDERED;

  return {
    requiredQuantity: required,
    quantityOnHand: onHand,
    quantityOnOrder: onOrder,
    shortage,
    status,
  };
};
