/** Keeps explicit filters, omits endpoint defaults and puts pagination first. */
export default function compactQueryParams(params = {}, defaults = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => [
        key,
        key === 'active' && value === '' && defaults.active === true ? 'all' : value,
      ])
      .filter(([key, value]) => {
        if (value === '' || value === null || value === undefined) return false;
        // Deleted collections do not apply the default active filter.
        if (
          key === 'active' &&
          [params.deleted, params.includeDeleted].some((flag) => flag === true || flag === 'true')
        )
          return value !== 'all';
        return !Object.hasOwn(defaults, key) || String(value) !== String(defaults[key]);
      })
      .sort(([left], [right]) => {
        const rank = (key) => (key === 'page' ? 0 : key === 'limit' ? 1 : 2);
        return rank(left) - rank(right) || (left < right ? -1 : left > right ? 1 : 0);
      }),
  );
}
