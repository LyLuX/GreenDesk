/** Paginates an already-loaded collection with the same metadata as server lists. */
export function paginateItems(items, requestedPage = 1, requestedLimit = 5) {
  const total = items.length;
  const limit = [5, 10, 25].includes(Number(requestedLimit)) ? Number(requestedLimit) : 5;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(Number(requestedPage) || 1, 1), totalPages);
  const visibleItems = items.slice((page - 1) * limit, page * limit);

  return {
    items: visibleItems,
    pagination: { page, limit, total, totalPages },
  };
}
