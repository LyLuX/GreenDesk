import client from './client.js';

/** HTTP operations available to GreenDesk administrators for user management. */
export const listUsers = () => client.get('/v1/users');
export const createUser = (payload) => client.post('/v1/users', payload);
export const updateUser = (uuid, payload) => client.put(`/v1/users/${uuid}`, payload);
export const deleteUser = (uuid) => client.delete(`/v1/users/${uuid}`);
