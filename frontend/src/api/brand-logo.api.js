import client from './client.js';

export const getBrandLogo = (uuid) =>
  client.get(`/v1/brands/${uuid}/logo`, { responseType: 'blob' });

export const uploadBrandLogo = (uuid, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post(`/v1/brands/${uuid}/logo`, formData);
};

export const deleteBrandLogo = (uuid) => client.delete(`/v1/brands/${uuid}/logo`);
