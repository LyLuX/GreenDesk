import client from './client.js';
import compactQueryParams from './query-params.js';

export const listMaintenanceTemplates = (params, signal) =>
  client.get('/v1/maintenance-templates', {
    params: compactQueryParams(params),
    signal,
  });
export const createMaintenanceTemplate = (payload) =>
  client.post('/v1/maintenance-templates', payload);
export const updateMaintenanceTemplate = (uuid, payload) =>
  client.put(`/v1/maintenance-templates/${uuid}`, payload);
export const deleteMaintenanceTemplate = (uuid) =>
  client.delete(`/v1/maintenance-templates/${uuid}`);
