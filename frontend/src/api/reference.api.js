import client from './client.js';
export const createReferenceApi = (resource) => ({
  list: (params, signal) => client.get(`/v1/${resource}`, { params, signal }),
  get: (uuid) => client.get(`/v1/${resource}/${uuid}`),
  create: (payload) => client.post(`/v1/${resource}`, payload),
  update: (uuid, payload) => client.put(`/v1/${resource}/${uuid}`, payload),
  setStatus: (uuid, active) => client.patch(`/v1/${resource}/${uuid}/status`, { active }),
});
