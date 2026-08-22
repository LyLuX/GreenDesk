import client from './client.js';
import compactQueryParams from './query-params.js';

export const listHistory = (section, params, signal) =>
  client.get(`/v1/history/${section}`, { params: compactQueryParams(params), signal });
