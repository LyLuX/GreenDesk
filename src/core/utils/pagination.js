export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 5;
export const PAGE_LIMITS = Object.freeze([5, 10, 25]);

/** Normalizes pagination even when a repository is called outside an HTTP route. */
export function normalizePagination({ page = DEFAULT_PAGE, limit = DEFAULT_PAGE_LIMIT } = {}) {
  const requestedPage = Number(page);
  const normalizedPage =
    Number.isInteger(requestedPage) && requestedPage >= DEFAULT_PAGE ? requestedPage : DEFAULT_PAGE;
  const requestedLimit = Number(limit);
  const normalizedLimit = PAGE_LIMITS.includes(requestedLimit)
    ? requestedLimit
    : DEFAULT_PAGE_LIMIT;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset: (normalizedPage - 1) * normalizedLimit,
  };
}

/** Builds the shared paginated API payload from a Sequelize find-and-count result. */
export function paginatedResult(result, pagination, mapItem = (item) => item) {
  const total = Number(result.count) || 0;
  return {
    items: result.rows.map(mapItem),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.max(Math.ceil(total / pagination.limit), 1),
    },
  };
}
