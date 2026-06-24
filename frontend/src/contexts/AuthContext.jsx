import { createContext, useContext, useEffect, useState } from 'react';
import api, { csrf } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await api.get(`/auth/me?_t=${Date.now()}`);
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    await csrf();
    const { data } = await api.post('/auth/login', { identifier, password });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await csrf();
      await api.post('/auth/logout', null, { params: { _t: Date.now() } });
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
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
