import type { User } from '@/domain/entities/User';

import type { AuthProvider } from '../ports';
import { loginSchema, registerSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

/**
 * Casos de uso de autenticação.
 *
 * Antes este serviço fazia hash de senha e guardava a sessão. Com o Supabase
 * isso é trabalho do servidor; aqui sobra o que sempre foi de fato regra de
 * aplicação: validar a entrada e traduzir a resposta em User de domínio.
 */
export class AuthService {
  constructor(private readonly provider: AuthProvider) {}

  /** Restaura o usuário da sessão persistida, se ainda for válida. */
  restoreSession(): Promise<User | null> {
    return this.provider.currentUser();
  }

  async login(input: unknown): Promise<User> {
    const { email, password } = validate(loginSchema, input);
    return this.provider.signIn(email, password);
  }

  /** Autocadastro público: sempre cria perfil de morador. */
  async register(input: unknown): Promise<User> {
    const data = validate(registerSchema, input);
    return this.provider.signUp(data);
  }

  /** Entra sem conta, para registrar uma denúncia e acompanhá-la. */
  continueAsGuest(): Promise<User> {
    return this.provider.signInAsGuest();
  }

  logout(): Promise<void> {
    return this.provider.signOut();
  }

  /**
   * Sessão expirada ou revogada chega por aqui. Sem isso o app ficaria com um
   * usuário em memória que o servidor já não reconhece — cenário que não
   * existia quando o banco era local.
   */
  onAuthStateChange(listener: (user: User | null) => void): () => void {
    return this.provider.onAuthStateChange(listener);
  }
}
