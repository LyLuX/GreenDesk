export const MIN_STOCK_QUANTITY = 0.01;

/** Rounds a maintenance stock quantity to the precision persisted in the database. */
export const roundStockQuantity = (value) => Math.round(Number(value) * 100) / 100;

export const addStockQuantities = (left, right) => roundStockQuantity(Number(left) + Number(right));

export const isValidStockQuantity = (value, { allowZero = false, maximum = 1000000 } = {}) => {
  const quantity = Number(value);
  return (
    Number.isFinite(quantity) &&
    quantity >= (allowZero ? 0 : MIN_STOCK_QUANTITY) &&
    quantity <= maximum &&
    Math.abs(quantity - roundStockQuantity(quantity)) < 1e-8
  );
};
