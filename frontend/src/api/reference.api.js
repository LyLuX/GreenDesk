import client from './client.js';
import compactQueryParams from './query-params.js';
const activeResources = new Set([
  'companies',
  'categories',
  'manufacturers',
  'suppliers',
  'materials',
]);
export const createReferenceApi = (resource) => ({
  list: (params, signal) =>
    client.get(`/v1/${resource}`, {
      params: compactQueryParams(params, {
        ...(activeResources.has(resource) ? { active: true } : {}),
        sort: resource === 'materials' ? 'purchaseDate' : 'name',
        direction: resource === 'materials' ? 'DESC' : 'ASC',
      }),
      signal,
    }),
  get: (uuid, params, signal) =>
    client.get(`/v1/${resource}/${uuid}`, { params: compactQueryParams(params), signal }),
  create: (payload) => client.post(`/v1/${resource}`, payload),
  update: (uuid, payload) => client.put(`/v1/${resource}/${uuid}`, payload),
  remove: (uuid) => client.delete(`/v1/${resource}/${uuid}`),
  restore: (uuid) => client.post(`/v1/${resource}/${uuid}/restore`),
});

export const listMaterialOptions = (params, signal) =>
  client.get('/v1/materials/options', {
    params: compactQueryParams(params, { active: true }),
    signal,
  });
