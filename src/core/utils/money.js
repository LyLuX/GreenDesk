export const MAX_UNIT_PRICE = 9999999999.99;

/** Normalizes a monetary value to the two decimals stored by MySQL DECIMAL columns. */
export const normalizeMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_UNIT_PRICE) return null;
  return (Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2);
};

/** Multiplies an integer quantity by a normalized monetary value without decimal drift. */
export const multiplyMoney = (unitPrice, quantity) => {
  const priceInCents = Math.round(Number(unitPrice) * 100);
  return ((priceInCents * Number(quantity)) / 100).toFixed(2);
};
