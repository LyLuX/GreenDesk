import client from './client.js';
import { clearAuthenticatedImageCache } from '../utils/authenticated-image-cache.js';

const baseUrl = (uuid) => `/v1/materials/${uuid}`;

export const uploadMaterialPhoto = (uuid, file, name, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  if (name?.trim()) formData.append('name', name.trim());
  return client.post(`${baseUrl(uuid)}/photos`, formData, { onUploadProgress }).then((response) => {
    clearAuthenticatedImageCache();
    return response;
  });
};

export const uploadMaterialDocument = (uuid, file, documentType, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  return client.post(`${baseUrl(uuid)}/documents`, formData, { onUploadProgress });
};

export const deleteMaterialFile = (uuid) =>
  client.delete(`/v1/materials/files/${uuid}`).then((response) => {
    clearAuthenticatedImageCache();
    return response;
  });
export const setPrimaryMaterialPhoto = (uuid) =>
  client.patch(`/v1/materials/files/${uuid}/primary`).then((response) => {
    clearAuthenticatedImageCache();
    return response;
  });
export const downloadMaterialFile = (uuid) =>
  client.get(`/v1/materials/files/${uuid}/download`, { responseType: 'blob' });
export const getMaterialFileContent = (uuid) =>
  client.get(`/v1/materials/files/${uuid}/content`, { responseType: 'blob' });
