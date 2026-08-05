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

// The SPA holds `user` in React state, so it keeps rendering the authenticated
// shell long after the server-side session has died — every request 401s while
// the UI still looks logged in, which reads to the user as "the app loaded but
// there's no data" and only clears on a full page reload. AuthProvider
// registers a handler here so a 401 anywhere tears down auth state once,
// centrally, instead of each of the ~80 call sites having to notice.
let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => {
    if (response.config._overlay) hideLoading();
    return response;
  },
  (error) => {
    if (error.config?._overlay) hideLoading();

    // 401: session gone. 419: CSRF token expired, which for a cookie-session
    // SPA means the same thing. Callers that expect a legitimate 401 (the
    // login form, the initial "am I logged in?" probe) opt out via
    // `_skipAuthRedirect` so a logged-out visitor isn't told their session
    // expired.
    const status = error.response?.status;
    if ((status === 401 || status === 419) && !error.config?._skipAuthRedirect) {
      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);

export const csrf = () => axios.get(CSRF_URL, { withCredentials: true });

export default api;
