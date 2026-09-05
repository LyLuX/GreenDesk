import client from './client.js';
import compactQueryParams from './query-params.js';

export const getRelationsGraph = (mode = 'simplified', scope = 'records') =>
  client.get('/v1/relations', {
    params: compactQueryParams({ mode, scope }, { mode: 'simplified', scope: 'models' }),
  });
