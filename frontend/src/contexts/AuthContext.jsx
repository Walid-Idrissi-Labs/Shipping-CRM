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
  const [sessionExpired, setSessionExpired] = useState(false);

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

  // The handler runs from an axios interceptor, outside React's data flow, so
  // it reads the current user through a ref rather than a stale closure.
  const userRef = useRef(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (handlingExpiry.current) return;
      handlingExpiry.current = true;

      if (userRef.current) {
        // We know who they are and they may be mid-form. Navigating to /login
        // here would throw away everything they had typed, so ask for the
        // password in place instead and leave the page exactly as it is.
        setSessionExpired(true);
        return;
      }

      // Nobody is signed in as far as the app knows (e.g. a reload landed on a
      // protected route with a dead session) — there is no in-progress work to
      // protect, so fall back to the login page. ProtectedRoute redirects on
      // its own once `user` is null; no router access needed here, since
      // AuthProvider sits outside BrowserRouter.
      const { pathname, search } = window.location;
      if (isReturnable(pathname)) {
        sessionStorage.setItem(RETURN_TO, pathname + search);
      }
      sessionStorage.setItem(EXPIRED_FLAG, '1');
      setUser(null);
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  // Re-auth from the in-place modal: same endpoint as a normal sign-in, but
  // nothing about the page changes around it. remember:true so a user who has
  // just been interrupted once isn't interrupted again.
  const reauthenticate = async (identifier, password) => {
    await csrf();
    const { data } = await api.post(
      '/auth/login',
      { identifier, password, remember: true },
      { _skipAuthRedirect: true },
    );
    setUser(data.user);
    setSessionExpired(false);
    handlingExpiry.current = false;
  };

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
      setSessionExpired(false);
      setUser(null);
      // Force a hard page reload to bypass any cached SPA state that may still hold the session.
      // This guarantees checkAuth() runs fresh on the loaded /login page.
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    loading,
    sessionExpired,
    login,
    logout,
    reauthenticate,
    refresh: checkAuth,
    isProvider: user?.role === 'prestataire',
    isClient: user?.role === 'client',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
