/** Removes cleared filters while preserving meaningful false and zero values. */
export default function compactQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  );
}
