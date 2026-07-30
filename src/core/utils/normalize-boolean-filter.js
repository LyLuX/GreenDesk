/** Converts query-string booleans without treating the text "false" as truthy. */
export default function normalizeBooleanFilter(value) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}
