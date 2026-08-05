import { createContext, useContext, useEffect, useRef, useState } from 'react';
import api, { csrf, setUnauthorizedHandler } from '../api/axios';

const AuthContext = createContext(null);

// Where Login looks for "you were kicked out, and here's where you were".
export const EXPIRED_FLAG = 'auth:sessionExpired';
export const RETURN_TO = 'auth:returnTo';

// Public surfaces are never worth returning to after a re-login.
const isReturnable = (path) => path.startsWith('/dashboard') || path.startsWith('/client') || path.startsWith('/employe');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // A dead session usually surfaces as several parallel 401s at once (a page
  // that fires three fetches on mount), so this has to be idempotent —
  // otherwise the last one to land overwrites the return path with whatever
  // route the redirect already moved us to. The guard lives in a ref rather
  // than the effect closure so `login()` can re-arm it: without that, a user
  // who signs back in and then idles out a second time within the same page
  // lifetime would never be redirected again.
  const handlingExpiry = useRef(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (handlingExpiry.current) return;
      handlingExpiry.current = true;

      const { pathname, search } = window.location;
      if (isReturnable(pathname)) {
        sessionStorage.setItem(RETURN_TO, pathname + search);
      }
      sessionStorage.setItem(EXPIRED_FLAG, '1');

      // ProtectedRoute already redirects to /login whenever `user` is null,
      // so clearing state here is all that's needed — no router access
      // required (AuthProvider sits outside BrowserRouter).
      setUser(null);
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const checkAuth = async () => {
    try {
      // _skipAuthRedirect: a 401 here just means "not logged in", which is the
      // normal state for any visitor on the public site.
      const { data } = await api.get(`/auth/me?_t=${Date.now()}`, { _skipAuthRedirect: true });
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password, remember = false) => {
    await csrf();
    // _skipAuthRedirect: a 401 here is "wrong password", not "session expired".
    const { data } = await api.post(
      '/auth/login',
      { identifier, password, remember },
      { _skipAuthRedirect: true },
    );
    sessionStorage.removeItem(EXPIRED_FLAG);
    handlingExpiry.current = false; // re-arm for the next expiry
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await csrf();
      // _skipAuthRedirect: logging out of an already-expired session 401s,
      // which is a successful outcome here, not a session-expired event.
      await api.post('/auth/logout', null, { params: { _t: Date.now() }, _skipAuthRedirect: true });
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      sessionStorage.removeItem(EXPIRED_FLAG);
      sessionStorage.removeItem(RETURN_TO);
      setUser(null);
      // Force a hard page reload to bypass any cached SPA state that may still hold the session.
      // This guarantees checkAuth() runs fresh on the loaded /login page.
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    refresh: checkAuth,
    isProvider: user?.role === 'prestataire',
    isClient: user?.role === 'client',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
