import type { User } from '@/domain/entities/User';
import { DomainError, ForbiddenError, NotFoundError } from '@/domain/errors';
import type { UserFilters, UserRepository } from '@/domain/repositories/UserRepository';
import { hasPermission } from '@/domain/rules/permissions';

import type { AuthProvider } from '../ports';
import { createUserSchema, userUpdateSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly auth: AuthProvider,
  ) {}

  async list(actor: User, filters?: UserFilters): Promise<User[]> {
    this.require(actor, 'user:list');
    return this.users.list(filters);
  }

  async getById(actor: User, id: string): Promise<User> {
    if (actor.id !== id) this.require(actor, 'user:list');
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('Usuário', id);
    return user;
  }

  /**
   * Criação feita por administrador — permite definir qualquer perfil.
   * Passa pelo AuthProvider porque cria uma conta de acesso, não só um perfil.
   * E-mail duplicado é recusado pelo próprio Supabase, então não há checagem
   * prévia aqui: ela seria uma corrida, além de vazar quais e-mails existem.
   */
  async create(actor: User, input: unknown): Promise<User> {
    this.require(actor, 'user:manage');
    const data = validate(createUserSchema, input);
    return this.auth.createUser(data);
  }

  /**
   * O próprio usuário edita seus dados; só administradores alteram perfis.
   * O e-mail não entra: é espelho da conta de autenticação (ver userUpdateSchema).
   */
  async update(actor: User, id: string, input: unknown): Promise<User> {
    const isSelf = actor.id === id;
    const canManage = hasPermission(actor, 'user:manage');
    if (!isSelf && !canManage) throw new ForbiddenError();

    const current = await this.getById(actor, id);
    const data = validate(userUpdateSchema, input);

    if (data.role !== current.role) {
      if (!canManage) throw new ForbiddenError('Apenas administradores podem alterar perfis.');
      if (current.role === 'admin') await this.ensureNotLastAdmin();
    }

    const updated: User = { ...current, ...data, updatedAt: new Date().toISOString() };
    await this.users.update(updated);
    return updated;
  }

  /** `async` de propósito: erro de validação sai como rejeição, não throw síncrono. */
  async changePassword(_actor: User, currentPassword: string, newPassword: string): Promise<void> {
    const { password } = validate(createUserSchema.pick({ password: true }), { password: newPassword });
    await this.auth.changePassword(currentPassword, password);
  }

  /**
   * Exclusão lógica.
   *
   * A conta de autenticação continua existindo — removê-la exigiria a
   * service_role key, que não pode estar no app. O que some é o perfil, e sem
   * perfil o login não completa (policy profiles_select, migração 0004).
   *
   * O ganho não é só de infraestrutura: os animais registrados por essa pessoa
   * continuam com autoria, e excluir alguém por engano é reversível.
   */
  async delete(actor: User, id: string): Promise<void> {
    if (!hasPermission(actor, 'user:manage')) {
      // Mensagem específica de propósito: a frase genérica de ForbiddenError
      // aparece em vários caminhos e não dizia onde a recusa aconteceu.
      throw new ForbiddenError(
        `Só administradores excluem usuários. Seu perfil neste aparelho é "${actor.role}"${actor.isGuest ? ' (convidado)' : ''}.`,
      );
    }
    if (actor.id === id) throw new DomainError('Você não pode excluir a própria conta.');

    const target = await this.getById(actor, id);
    if (target.role === 'admin') await this.ensureNotLastAdmin();
    await this.users.softDelete(id, new Date().toISOString());
  }

  private require(actor: User, permission: Parameters<typeof hasPermission>[1]): void {
    if (!hasPermission(actor, permission)) throw new ForbiddenError();
  }

  /**
   * Checagem amigável, feita antes da ida ao servidor. A garantia de verdade é
   * o trigger guard_profile_update/guard_profile_delete: com vários usuários
   * simultâneos, dois admins se rebaixando ao mesmo tempo passariam os dois por
   * aqui — o banco é quem recusa o segundo.
   */
  private async ensureNotLastAdmin(): Promise<void> {
    if ((await this.users.countByRole('admin')) <= 1) {
      throw new DomainError('O sistema precisa de pelo menos um administrador.');
    }
  }
}
