import client from './client.js';
import { clearAuthenticatedImageCache } from '../utils/authenticated-image-cache.js';

export const getCompanyLogo = (uuid) =>
  client.get(`/v1/companies/${uuid}/logo`, { responseType: 'blob' });

export const uploadCompanyLogo = (uuid, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post(`/v1/companies/${uuid}/logo`, formData).then((response) => {
    clearAuthenticatedImageCache();
    return response;
  });
};

export const deleteCompanyLogo = (uuid) =>
  client.delete(`/v1/companies/${uuid}/logo`).then((response) => {
    clearAuthenticatedImageCache();
    return response;
  });
