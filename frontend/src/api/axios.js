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
  async (error) => {
    if (error.config?._overlay) hideLoading();

    const status = error.response?.status;

    // 419 is a CSRF token mismatch, NOT a dead session — the token can go
    // stale on its own while the session stays perfectly valid. Refresh the
    // cookie and replay the request once.
    //
    // This previously fell through to the 401 branch below and logged the
    // user out mid-work, then stranded them: the /login page's own POST hit
    // the same stale token, so every attempt showed "votre session a expiré"
    // and there was no way back in short of clearing cookies.
    if (status === 419 && !error.config?._csrfRetried) {
      error.config._csrfRetried = true;
      try {
        clearXsrfCookie();
        await csrf();
        return await api.request(error.config);
      } catch {
        // Refresh or replay failed too — fall through and reject below so the
        // caller still sees a real error rather than hanging.
      }
    }

    // 401: the server no longer recognises our session. Callers that expect a
    // legitimate 401 (the login form, the initial "am I logged in?" probe,
    // logout) opt out via `_skipAuthRedirect` so a logged-out visitor isn't
    // told their session expired.
    if (status === 401 && !error.config?._skipAuthRedirect) {
      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);

export const csrf = () => axios.get(CSRF_URL, { withCredentials: true });

// A stale XSRF-TOKEN can sit in a different cookie scope than the one Laravel
// writes to (host-only vs .domain). Axios sends whichever the browser lists
// first, so simply minting a fresh token can keep losing to the stale copy and
// wedge every write with a 419. Delete it from every scope it could live in
// first. Safe to call unconditionally: the cookie is re-issued right after,
// and it is not HttpOnly, so it is ours to clear.
const clearXsrfCookie = () => {
  const { hostname } = window.location;
  const scopes = ['', `; domain=${hostname}`, `; domain=.${hostname}`];
  const parent = hostname.split('.').slice(-2).join('.');
  if (parent !== hostname) scopes.push(`; domain=.${parent}`);
  scopes.forEach((scope) => {
    document.cookie = `XSRF-TOKEN=; Max-Age=0; path=/${scope}`;
  });
};

export default api;
