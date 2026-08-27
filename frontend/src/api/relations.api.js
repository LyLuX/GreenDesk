import client from './client.js';

export const getRelationsGraph = (mode = 'simplified', scope = 'records') =>
  client.get('/v1/relations', { params: { mode, scope } });
