import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { User } from '@/domain/entities/User';
import { hasPermission, type Permission } from '@/domain/rules/permissions';
import { createServices, type Services } from '@/infrastructure/container';

// Os serviços não dependem mais de um banco aberto em runtime, então são
// montados uma vez só, no carregamento do módulo.
const services = createServices();

const ServicesContext = createContext<Services | null>(null);

interface AuthState {
  user: User | null;
  /** true enquanto a sessão salva ainda está sendo restaurada. */
  isLoading: boolean;
  login: (input: unknown) => Promise<void>;
  register: (input: unknown) => Promise<void>;
  /** Entra sem conta: registra denúncia e acompanha as próprias. */
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  /** Atualiza o usuário em memória após editar o próprio perfil. */
  setUser: (user: User) => void;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ServicesContext.Provider value={services}>
      <AuthProvider>{children}</AuthProvider>
    </ServicesContext.Provider>
  );
}

function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useServices();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    auth
      .restoreSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, [auth]);

  /**
   * Com banco local o usuário em memória nunca podia ficar defasado. Agora a
   * sessão pode expirar, ser revogada ou cair por troca de senha em outro
   * aparelho — o app precisa reagir a isso, e não descobrir na próxima escrita.
   */
  useEffect(() => auth.onAuthStateChange(setUser), [auth]);

  const login = useCallback(async (input: unknown) => setUser(await auth.login(input)), [auth]);
  const register = useCallback(async (input: unknown) => setUser(await auth.register(input)), [auth]);
  const continueAsGuest = useCallback(async () => setUser(await auth.continueAsGuest()), [auth]);
  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
  }, [auth]);
  const can = useCallback((permission: Permission) => hasPermission(user, permission), [user]);

  const value = useMemo(
    () => ({ user, isLoading, login, register, continueAsGuest, logout, setUser, can }),
    [user, isLoading, login, register, continueAsGuest, logout, can],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices deve ser usado dentro de AppProviders.');
  return services;
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth deve ser usado dentro de AppProviders.');
  return auth;
}

/** Para telas protegidas: garante que existe um usuário logado. */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('Tela protegida acessada sem usuário logado.');
  return user;
}
