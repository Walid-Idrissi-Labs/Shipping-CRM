import axios from 'axios';
import { showLoading, hideLoading } from './loadingService';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = API_URL ? `${API_URL}/api` : '/api';
const CSRF_URL = API_URL ? `${API_URL}/sanctum/csrf-cookie` : '/sanctum/csrf-cookie';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// GET loading states are rendered by the pages themselves (PageLoader
// skeletons); the global overlay only covers mutations, which have no
// page-level loader.
api.interceptors.request.use((config) => {
  if ((config.method || 'get').toLowerCase() !== 'get') {
    config._overlay = true;
    showLoading();
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.config._overlay) hideLoading();
    return response;
  },
  (error) => {
    if (error.config?._overlay) hideLoading();
    return Promise.reject(error);
  },
);

export const csrf = () => axios.get(CSRF_URL, { withCredentials: true });

export default api;
