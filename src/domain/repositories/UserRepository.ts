import type { User, UserRole } from '../entities/User';

export interface UserFilters {
  search?: string;
  role?: UserRole;
}

/**
 * Contrato de persistência do perfil.
 *
 * Credenciais não aparecem aqui: quem guarda senha é o provedor de
 * autenticação (application/ports.ts → AuthProvider), não o repositório.
 * Criar e excluir contas também é dele, porque envolve a conta de acesso e
 * não só a linha de perfil.
 */
export interface UserRepository {
  list(filters?: UserFilters): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  update(user: User): Promise<void>;
  /**
   * Exclusão lógica: marca a data e o perfil some das consultas.
   *
   * A conta de autenticação continua existindo — apagá-la exigiria privilégio
   * de servidor —, mas sem perfil o login não completa. O histórico de quem
   * registrou animais sobrevive, que é o motivo principal de ser lógica.
   */
  softDelete(id: string, at: string): Promise<void>;
  countByRole(role: UserRole): Promise<number>;
}
