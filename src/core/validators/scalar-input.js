/** Prevents validator.js from silently validating or sanitizing an array as scalar input. */
export const isScalarInput = (value) => ['string', 'number', 'boolean'].includes(typeof value);
