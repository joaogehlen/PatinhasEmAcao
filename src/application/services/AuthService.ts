import type { User } from '@/domain/entities/User';
import { AuthenticationError, ConflictError } from '@/domain/errors';
import type { UserRepository } from '@/domain/repositories/UserRepository';

import type { Clock, IdGenerator, PasswordHasher, SessionStore } from '../ports';
import { loginSchema, registerSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly session: SessionStore,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /** Restaura o usuário da sessão persistida, se ainda existir. */
  async restoreSession(): Promise<User | null> {
    const userId = await this.session.getUserId();
    if (!userId) return null;

    const user = await this.users.findById(userId);
    if (!user) await this.session.clear();
    return user;
  }

  async login(input: unknown): Promise<User> {
    const { email, password } = validate(loginSchema, input);
    const stored = await this.users.findByEmailWithCredentials(email);
    if (!stored) throw new AuthenticationError();

    const hash = await this.hasher.hash(password, stored.passwordSalt);
    if (hash !== stored.passwordHash) throw new AuthenticationError();

    await this.session.setUserId(stored.id);
    const { passwordHash: _hash, passwordSalt: _salt, ...user } = stored;
    return user;
  }

  /** Autocadastro público: sempre cria perfil de morador. */
  async register(input: unknown): Promise<User> {
    const data = validate(registerSchema, input);
    if (await this.users.findByEmailWithCredentials(data.email)) {
      throw new ConflictError('Já existe uma conta com este e-mail.');
    }

    const salt = await this.hasher.generateSalt();
    const now = this.clock.nowIso();
    const user: User = {
      id: this.ids.next(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: 'morador',
      createdAt: now,
      updatedAt: now,
    };

    await this.users.create({
      ...user,
      passwordHash: await this.hasher.hash(data.password, salt),
      passwordSalt: salt,
    });
    await this.session.setUserId(user.id);
    return user;
  }

  async logout(): Promise<void> {
    await this.session.clear();
  }
}
