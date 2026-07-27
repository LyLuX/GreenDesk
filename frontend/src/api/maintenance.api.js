import client from './client.js';
import compactQueryParams from './query-params.js';

export const listMaintenance = (params, signal) =>
  client.get('/v1/maintenance', { params: compactQueryParams(params), signal });
export const createMaintenance = (payload) => client.post('/v1/maintenance', payload);
export const updateMaintenance = (uuid, payload) => client.put(`/v1/maintenance/${uuid}`, payload);
export const setMaintenanceStatus = (uuid, active) =>
  client.patch(`/v1/maintenance/${uuid}/status`, { active });
export const deleteMaintenance = (uuid) => client.delete(`/v1/maintenance/${uuid}`);
export const executeMaintenance = (uuid, payload) =>
  client.post(`/v1/maintenance/${uuid}/execute`, payload);
export const maintenanceHistory = (uuid) => client.get(`/v1/maintenance/${uuid}/history`);
export const listMaintenanceOperations = (signal) =>
  client.get('/v1/maintenance/operations', { signal });
export const createMaintenanceOperation = (payload) =>
  client.post('/v1/maintenance/operations', payload);
export const updateMaintenanceOperation = (uuid, payload) =>
  client.put(`/v1/maintenance/operations/${uuid}`, payload);
export const deleteMaintenanceOperation = (uuid) =>
  client.delete(`/v1/maintenance/operations/${uuid}`);
export const listMaintenanceManufacturers = (signal) =>
  client.get('/v1/maintenance/manufacturers', { signal });
export const createMaintenanceManufacturer = (payload) =>
  client.post('/v1/maintenance/manufacturers', payload);
export const updateMaintenanceManufacturer = (uuid, payload) =>
  client.put(`/v1/maintenance/manufacturers/${uuid}`, payload);
export const deleteMaintenanceManufacturer = (uuid) =>
  client.delete(`/v1/maintenance/manufacturers/${uuid}`);
export const listMaintenanceSuppliers = (signal) =>
  client.get('/v1/maintenance/suppliers', { signal });
export const createMaintenanceSupplier = (payload) =>
  client.post('/v1/maintenance/suppliers', payload);
export const updateMaintenanceSupplier = (uuid, payload) =>
  client.put(`/v1/maintenance/suppliers/${uuid}`, payload);
export const deleteMaintenanceSupplier = (uuid) =>
  client.delete(`/v1/maintenance/suppliers/${uuid}`);
export const listMaintenanceParts = (signal) => client.get('/v1/maintenance/parts', { signal });
export const createMaintenancePart = (payload) => client.post('/v1/maintenance/parts', payload);
export const updateMaintenancePart = (uuid, payload) =>
  client.put(`/v1/maintenance/parts/${uuid}`, payload);
export const deleteMaintenancePart = (uuid) => client.delete(`/v1/maintenance/parts/${uuid}`);
export const getMaintenanceOrderList = (params, signal) =>
  client.get('/v1/maintenance/order-list', {
    params: compactQueryParams(params),
    signal,
  });
