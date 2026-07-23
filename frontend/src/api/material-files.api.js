import client from './client.js';

const baseUrl = (uuid) => `/v1/materials/${uuid}`;

export const uploadMaterialPhoto = (uuid, file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post(`${baseUrl(uuid)}/photos`, formData, { onUploadProgress });
};

export const uploadMaterialDocument = (uuid, file, documentType, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  return client.post(`${baseUrl(uuid)}/documents`, formData, { onUploadProgress });
};

export const deleteMaterialFile = (uuid) => client.delete(`/v1/materials/files/${uuid}`);
export const setPrimaryMaterialPhoto = (uuid) =>
  client.patch(`/v1/materials/files/${uuid}/primary`);
export const downloadMaterialFile = (uuid) =>
  client.get(`/v1/materials/files/${uuid}/download`, { responseType: 'blob' });
export const getMaterialFileContent = (uuid) =>
  client.get(`/v1/materials/files/${uuid}/content`, { responseType: 'blob' });
