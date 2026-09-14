import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { User } from '@/domain/entities/User';
import { hasPermission, type Permission } from '@/domain/rules/permissions';
import { createServices, seedIfEmpty, type Services } from '@/infrastructure/container';
import { DATABASE_NAME, migrateDatabase } from '@/infrastructure/database/migrations';

const ServicesContext = createContext<Services | null>(null);

interface AuthState {
  user: User | null;
  /** true enquanto a sessão salva ainda está sendo restaurada. */
  isLoading: boolean;
  login: (input: unknown) => Promise<void>;
  register: (input: unknown) => Promise<void>;
  logout: () => Promise<void>;
  /** Atualiza o usuário em memória após editar o próprio perfil. */
  setUser: (user: User) => void;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

async function initDatabase(db: Parameters<typeof migrateDatabase>[0]) {
  await migrateDatabase(db);
  await seedIfEmpty(db);
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <ServicesProvider>
        <AuthProvider>{children}</AuthProvider>
      </ServicesProvider>
    </SQLiteProvider>
  );
}

function ServicesProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const services = useMemo(() => createServices(db), [db]);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
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

  const login = useCallback(async (input: unknown) => setUser(await auth.login(input)), [auth]);
  const register = useCallback(async (input: unknown) => setUser(await auth.register(input)), [auth]);
  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
  }, [auth]);
  const can = useCallback((permission: Permission) => hasPermission(user, permission), [user]);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, setUser, can }),
    [user, isLoading, login, register, logout, can],
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
