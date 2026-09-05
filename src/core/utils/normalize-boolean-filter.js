/** Converts query-string booleans without treating the text "false" as truthy. */
export default function normalizeBooleanFilter(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}
