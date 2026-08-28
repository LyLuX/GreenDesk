const numericAuditFields = new Set([
  'intervalDays',
  'minimumStock',
  'purchasePrice',
  'quantity',
  'quantityOnHand',
  'quantityOnOrder',
  'unitPrice',
]);

const hasNumericValue = (value) => value !== null && value !== undefined && value !== '';

/** Compares audit values by their business meaning instead of their serialized database type. */
export const auditValuesAreEqual = (key, before, after) => {
  if (numericAuditFields.has(key) && hasNumericValue(before) && hasNumericValue(after)) {
    const beforeNumber = Number(before);
    const afterNumber = Number(after);
    if (Number.isFinite(beforeNumber) && Number.isFinite(afterNumber)) {
      return beforeNumber === afterNumber;
    }
  }
  return JSON.stringify(before) === JSON.stringify(after);
};
