import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await api.getCurrentUser());
      return true;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (username, password) => {
    const result = await api.login({ username, password });
    if (result.status === 'SUCCESS') {
      setUser(result.user);
    }
    return result;
  }, []);

  const completeMfaLogin = useCallback(async (challengeToken, code) => {
    const loggedInUser = await api.verifyMfa({ challengeToken, code });
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const completeMfaSetup = useCallback(async (challengeToken, code) => {
    const result = await api.confirmMfaSetup({ challengeToken, code });
    setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* ignore expired session */
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      completeMfaLogin,
      completeMfaSetup,
      logout,
      refreshUser,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, login, completeMfaLogin, completeMfaSetup, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
