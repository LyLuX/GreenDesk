import axios from 'axios';
import { getAccessToken, clearSession } from '../auth/auth.storage.js';
import { readActiveCompanyUuid } from '../auth/company.storage.js';
import { rememberCurrentReturnLocation } from '../auth/return-location.js';
const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  const companyUuid = readActiveCompanyUuid();
  if (companyUuid) config.headers = { ...config.headers, 'X-Company-Uuid': companyUuid };
  return config;
});
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      rememberCurrentReturnLocation();
      clearSession();
      window.dispatchEvent(new Event('greendesk:unauthorized'));
    }
    return Promise.reject(error);
  },
);
export default client;
