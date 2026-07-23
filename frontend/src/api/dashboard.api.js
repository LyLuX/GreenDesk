import client from './client.js';
export const getDashboardSummary = () => client.get('/v1/dashboard/summary');
