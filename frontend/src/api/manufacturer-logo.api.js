import client from './client.js';

export const getManufacturerLogo = (uuid) =>
  client.get(`/v1/manufacturers/${uuid}/logo`, { responseType: 'blob' });

export const uploadManufacturerLogo = (uuid, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post(`/v1/manufacturers/${uuid}/logo`, formData);
};

export const deleteManufacturerLogo = (uuid) => client.delete(`/v1/manufacturers/${uuid}/logo`);
