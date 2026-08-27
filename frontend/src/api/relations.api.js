import client from './client.js';

export const getRelationsGraph = (mode = 'simplified') =>
  client.get('/v1/relations', { params: { mode } });
