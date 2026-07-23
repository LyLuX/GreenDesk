import client from './client.js';

export const listMaintenance = (params, signal) =>
  client.get('/v1/maintenance', { params, signal });
export const createMaintenance = (payload) => client.post('/v1/maintenance', payload);
export const updateMaintenance = (uuid, payload) => client.put(`/v1/maintenance/${uuid}`, payload);
export const executeMaintenance = (uuid, payload) =>
  client.post(`/v1/maintenance/${uuid}/execute`, payload);
export const maintenanceHistory = (uuid) => client.get(`/v1/maintenance/${uuid}/history`);
