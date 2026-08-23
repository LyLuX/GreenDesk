const pageLimit = 25;

/** Loads every page exposed by a paginated list endpoint. */
export default async function listAllPages(list, params = {}, signal) {
  const items = [];
  let page = 1;

  while (true) {
    const response = await list({ ...params, page, limit: pageLimit }, signal);
    const payload = response.data.data ?? [];
    if (Array.isArray(payload)) return payload;

    const pageItems = payload.items ?? [];
    items.push(...pageItems);
    const pagination = payload.pagination;
    if (!pagination || pagination.page >= pagination.totalPages || !pageItems.length) return items;
    page = pagination.page + 1;
  }
}
