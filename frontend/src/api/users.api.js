import client from './client.js';
import compactQueryParams from './query-params.js';

/** HTTP operations available to GreenDesk administrators for user management. */
export const listUsers = (params, signal) =>
  client.get('/v1/users', { params: compactQueryParams(params), signal });
export const createUser = (payload) => client.post('/v1/users', payload);
export const updateUser = (uuid, payload) => client.put(`/v1/users/${uuid}`, payload);
export const deleteUser = (uuid) => client.delete(`/v1/users/${uuid}`);
export const restoreUser = (uuid) => client.post(`/v1/users/${uuid}/restore`);
export const resendUserEmailVerification = (uuid) =>
  client.post(`/v1/users/${uuid}/email-verification/resend`);
