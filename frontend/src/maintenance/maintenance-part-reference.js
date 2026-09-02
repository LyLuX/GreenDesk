/** Indicates whether a part has a supplier reference worth displaying separately. */
export const hasDistinctSupplierReference = (part) => {
  const reference = String(part?.reference ?? '').trim();
  const supplierReference = String(part?.supplierReference ?? '').trim();
  return Boolean(supplierReference && supplierReference !== reference);
};
