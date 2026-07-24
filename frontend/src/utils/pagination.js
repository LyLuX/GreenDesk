export const ALL_ITEMS = 'all';

/** Paginates an already-loaded collection with the same metadata as server lists. */
export function paginateItems(items, requestedPage = 1, requestedLimit = 5) {
  const total = items.length;
  const showAll = requestedLimit === ALL_ITEMS;
  const limit = showAll ? Math.max(total, 1) : Number(requestedLimit) || 5;
  const totalPages = showAll ? 1 : Math.max(Math.ceil(total / limit), 1);
  const page = showAll ? 1 : Math.min(Math.max(Number(requestedPage) || 1, 1), totalPages);
  const visibleItems = showAll ? items : items.slice((page - 1) * limit, page * limit);

  return {
    items: visibleItems,
    pagination: { page, limit, total, totalPages },
  };
}
