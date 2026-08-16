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
export const maintenanceHistory = (uuid, params, signal) =>
  client.get(`/v1/maintenance/${uuid}/history`, {
    params: compactQueryParams(params),
    signal,
  });
export const listMaintenanceOperations = (params, signal) =>
  client.get('/v1/maintenance/operations', { params: compactQueryParams(params), signal });
export const createMaintenanceOperation = (payload) =>
  client.post('/v1/maintenance/operations', payload);
export const updateMaintenanceOperation = (uuid, payload) =>
  client.put(`/v1/maintenance/operations/${uuid}`, payload);
export const deleteMaintenanceOperation = (uuid) =>
  client.delete(`/v1/maintenance/operations/${uuid}`);
export const listMaintenanceParts = (params, signal) =>
  client.get('/v1/maintenance/parts', { params: compactQueryParams(params), signal });
export const createMaintenancePart = (payload) => client.post('/v1/maintenance/parts', payload);
export const updateMaintenancePart = (uuid, payload) =>
  client.put(`/v1/maintenance/parts/${uuid}`, payload);
export const updateMaintenancePartStock = (uuid, payload) =>
  client.patch(`/v1/maintenance/parts/${uuid}/stock`, payload);
export const updateMaintenancePartPrice = (uuid, payload) =>
  client.patch(`/v1/maintenance/parts/${uuid}/price`, payload);
export const listMaintenancePartStockMovements = (uuid, params, signal) =>
  client.get(`/v1/maintenance/parts/${uuid}/stock-movements`, {
    params: compactQueryParams(params),
    signal,
  });
export const listMaintenancePartPriceHistory = (uuid, params, signal) =>
  client.get(`/v1/maintenance/parts/${uuid}/price-history`, {
    params: compactQueryParams(params),
    signal,
  });
export const deleteMaintenancePart = (uuid) => client.delete(`/v1/maintenance/parts/${uuid}`);
export const getMaintenanceOrderList = (params, signal) =>
  client.get('/v1/maintenance/order-list', {
    params: compactQueryParams(params),
    signal,
  });
