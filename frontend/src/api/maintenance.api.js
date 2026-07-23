import client from './client.js';

export const listMaintenance = (params, signal) =>
  client.get('/v1/maintenance', { params, signal });
export const createMaintenance = (payload) => client.post('/v1/maintenance', payload);
export const updateMaintenance = (uuid, payload) => client.put(`/v1/maintenance/${uuid}`, payload);
export const setMaintenanceStatus = (uuid, active) =>
  client.patch(`/v1/maintenance/${uuid}/status`, { active });
export const deleteMaintenance = (uuid) => client.delete(`/v1/maintenance/${uuid}`);
export const executeMaintenance = (uuid, payload) =>
  client.post(`/v1/maintenance/${uuid}/execute`, payload);
export const maintenanceHistory = (uuid) => client.get(`/v1/maintenance/${uuid}/history`);
