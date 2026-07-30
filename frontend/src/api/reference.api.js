import client from './client.js';
import compactQueryParams from './query-params.js';
export const createReferenceApi = (resource) => ({
  list: (params, signal) =>
    client.get(`/v1/${resource}`, { params: compactQueryParams(params), signal }),
  get: (uuid) => client.get(`/v1/${resource}/${uuid}`),
  create: (payload) => client.post(`/v1/${resource}`, payload),
  update: (uuid, payload) => client.put(`/v1/${resource}/${uuid}`, payload),
  remove: (uuid) => client.delete(`/v1/${resource}/${uuid}`),
});
