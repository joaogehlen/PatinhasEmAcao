import type { User } from '@/domain/entities/User';
import { AuthenticationError, ConflictError, DomainError, ForbiddenError, NotFoundError } from '@/domain/errors';
import type { UserFilters, UserRepository } from '@/domain/repositories/UserRepository';
import { hasPermission } from '@/domain/rules/permissions';

import type { Clock, IdGenerator, PasswordHasher } from '../ports';
import { createUserSchema, userProfileSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
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

  /** Criação feita por administrador — permite definir qualquer perfil. */
  async create(actor: User, input: unknown): Promise<User> {
    this.require(actor, 'user:manage');
    const data = validate(createUserSchema, input);
    await this.ensureEmailAvailable(data.email);

    const salt = await this.hasher.generateSalt();
    const now = this.clock.nowIso();
    const user: User = {
      id: this.ids.next(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      createdAt: now,
      updatedAt: now,
    };
    await this.users.create({
      ...user,
      passwordHash: await this.hasher.hash(data.password, salt),
      passwordSalt: salt,
    });
    return user;
  }

  /** O próprio usuário edita seus dados; só administradores alteram perfis. */
  async update(actor: User, id: string, input: unknown): Promise<User> {
    const isSelf = actor.id === id;
    const canManage = hasPermission(actor, 'user:manage');
    if (!isSelf && !canManage) throw new ForbiddenError();

    const current = await this.getById(actor, id);
    const data = validate(userProfileSchema, input);

    if (data.role !== current.role) {
      if (!canManage) throw new ForbiddenError('Apenas administradores podem alterar perfis.');
      if (current.role === 'admin') await this.ensureNotLastAdmin();
    }
    if (data.email !== current.email) await this.ensureEmailAvailable(data.email);

    const updated: User = { ...current, ...data, updatedAt: this.clock.nowIso() };
    await this.users.update(updated);
    return updated;
  }

  async changePassword(actor: User, currentPassword: string, newPassword: string): Promise<void> {
    const stored = await this.users.findByEmailWithCredentials(actor.email);
    if (!stored) throw new NotFoundError('Usuário', actor.id);

    if ((await this.hasher.hash(currentPassword, stored.passwordSalt)) !== stored.passwordHash) {
      throw new AuthenticationError('Senha atual incorreta.');
    }
    const { password } = validate(createUserSchema.pick({ password: true }), { password: newPassword });
    const salt = await this.hasher.generateSalt();
    await this.users.updateCredentials(actor.id, await this.hasher.hash(password, salt), salt);
  }

  async delete(actor: User, id: string): Promise<void> {
    this.require(actor, 'user:manage');
    if (actor.id === id) throw new DomainError('Você não pode excluir a própria conta.');

    const target = await this.getById(actor, id);
    if (target.role === 'admin') await this.ensureNotLastAdmin();
    await this.users.delete(id);
  }

  private require(actor: User, permission: Parameters<typeof hasPermission>[1]): void {
    if (!hasPermission(actor, permission)) throw new ForbiddenError();
  }

  private async ensureEmailAvailable(email: string): Promise<void> {
    if (await this.users.findByEmailWithCredentials(email)) {
      throw new ConflictError('Já existe uma conta com este e-mail.');
    }
  }

  private async ensureNotLastAdmin(): Promise<void> {
    if ((await this.users.countByRole('admin')) <= 1) {
      throw new DomainError('O sistema precisa de pelo menos um administrador.');
    }
  }
}
