import type { User, UserRole } from '@/domain/entities/User';

/**
 * Portas: dependências externas que os serviços usam via interface.
 * Isso mantém a regra de negócio testável sem Expo/React Native/Supabase.
 */

export interface IdGenerator {
  next(): string;
}

export interface Clock {
  nowIso(): string;
}

export interface SignUpInput {
  name: string;
  email: string;
  phone: string | null;
  password: string;
}

export interface CreateUserInput extends SignUpInput {
  role: UserRole;
}

/**
 * Autenticação e ciclo de vida da conta.
 *
 * Substitui os antigos PasswordHasher e SessionStore: com o Supabase, hash de
 * senha, emissão de token e persistência de sessão são responsabilidade do
 * servidor. O app nunca vê uma senha armazenada.
 *
 * `createUser` mexe na conta de acesso, não só no perfil, e por isso exige
 * privilégio de servidor — a implementação chama uma Edge Function. Ver
 * supabase/functions/admin-users/.
 *
 * Excluir usuário NÃO está aqui: virou exclusão lógica no perfil
 * (UserRepository.softDelete), justamente para não depender de deploy.
 */
export interface AuthProvider {
  /** Usuário da sessão persistida, ou null. */
  currentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<User>;
  /** Autocadastro público: o perfil nasce sempre como 'morador'. */
  signUp(input: SignUpInput): Promise<User>;
  /**
   * Entra sem conta. A sessão anônima fica no aparelho e é o que permite ao
   * convidado acompanhar as denúncias que ele mesmo abriu.
   */
  signInAsGuest(): Promise<User>;
  signOut(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  /** Criação por administrador, com perfil arbitrário. */
  createUser(input: CreateUserInput): Promise<User>;
  /** Notifica login, logout e expiração de sessão. Devolve o cancelamento. */
  onAuthStateChange(listener: (user: User | null) => void): () => void;
}
