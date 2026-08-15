import client from './client.js';
import compactQueryParams from './query-params.js';
export const createReferenceApi = (resource) => ({
  list: (params, signal) =>
    client.get(`/v1/${resource}`, { params: compactQueryParams(params), signal }),
  get: (uuid, params, signal) =>
    client.get(`/v1/${resource}/${uuid}`, { params: compactQueryParams(params), signal }),
  create: (payload) => client.post(`/v1/${resource}`, payload),
  update: (uuid, payload) => client.put(`/v1/${resource}/${uuid}`, payload),
  remove: (uuid) => client.delete(`/v1/${resource}/${uuid}`),
});

export const listMaterialOptions = (params, signal) =>
  client.get('/v1/materials/options', { params: compactQueryParams(params), signal });
