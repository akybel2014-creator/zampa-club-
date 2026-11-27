import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import {
  CustomerUser,
  fetchAuthSession,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  updateCustomerPetProfile,
} from '../services/wooCommerceService';

interface AuthContextValue {
  user: CustomerUser | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  checkingSession: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    petName?: string;
    petType?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  savePetProfile: (params: {
    petName: string;
    petType: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAuthSession().then((res) => {
      if (!active) return;
      if (res.authenticated && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
      setCheckingSession(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginCustomer(email, password);
    if (!res.ok || !res.user) {
      return { ok: false, error: res.error || 'Unable to sign in.' };
    }
    setUser(res.user);
    if (res.sessionToken) {
      setSessionToken(res.sessionToken);
    }
    return { ok: true };
  }, []);

  const register = useCallback(
    async (params: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      petName?: string;
      petType?: string;
    }) => {
      const res = await registerCustomer(params);
      if (!res.ok || !res.user) {
        return { ok: false, error: res.error || 'Unable to create your account.' };
      }
      setUser(res.user);
      if (res.sessionToken) {
        setSessionToken(res.sessionToken);
      }
      return { ok: true };
    },
    []
  );

  const logout = useCallback(async () => {
    await logoutCustomer(sessionToken);
    setUser(null);
    setSessionToken(null);
  }, [sessionToken]);

  const savePetProfile = useCallback(
    async (params: { petName: string; petType: string }) => {
      const res = await updateCustomerPetProfile(params, sessionToken);
      if (res.ok && res.user) {
        setUser(res.user);
        return { ok: true };
      }
      if (user) {
        setUser({
          ...user,
          petName: params.petName,
          petType: params.petType,
        });
      }
      return res.ok ? { ok: true } : { ok: false, error: res.error };
    },
    [sessionToken, user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        isAuthenticated: Boolean(user),
        checkingSession,
        login,
        register,
        logout,
        savePetProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
