import type { Clock, IdGenerator, PasswordHasher, SessionStore } from '@/application/ports';
import type { Animal, AnimalStatusChange } from '@/domain/entities/Animal';
import type { User, UserRole, UserWithCredentials } from '@/domain/entities/User';
import type { AnimalFilters, AnimalRepository } from '@/domain/repositories/AnimalRepository';
import type { UserFilters, UserRepository } from '@/domain/repositories/UserRepository';

/** Implementações em memória para testar os serviços sem SQLite/Expo. */
export class InMemoryUserRepository implements UserRepository {
  readonly rows = new Map<string, UserWithCredentials>();

  private strip({ passwordHash: _h, passwordSalt: _s, ...user }: UserWithCredentials): User {
    return user;
  }

  async list(filters: UserFilters = {}) {
    return [...this.rows.values()].filter((u) => !filters.role || u.role === filters.role).map((u) => this.strip(u));
  }
  async findById(id: string) {
    const row = this.rows.get(id);
    return row ? this.strip(row) : null;
  }
  async findByEmailWithCredentials(email: string) {
    return [...this.rows.values()].find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }
  async create(user: UserWithCredentials) {
    this.rows.set(user.id, user);
  }
  async update(user: User) {
    const row = this.rows.get(user.id)!;
    this.rows.set(user.id, { ...row, ...user });
  }
  async updateCredentials(id: string, passwordHash: string, passwordSalt: string) {
    this.rows.set(id, { ...this.rows.get(id)!, passwordHash, passwordSalt });
  }
  async delete(id: string) {
    this.rows.delete(id);
  }
  async countByRole(role: UserRole) {
    return [...this.rows.values()].filter((u) => u.role === role).length;
  }
}

export class InMemoryAnimalRepository implements AnimalRepository {
  readonly rows = new Map<string, Animal>();
  readonly history: AnimalStatusChange[] = [];

  async list(filters: AnimalFilters = {}) {
    return [...this.rows.values()].filter(
      (a) => (!filters.species || a.species === filters.species) && (!filters.status || a.status === filters.status),
    );
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async create(animal: Animal, initialStatus: AnimalStatusChange) {
    this.rows.set(animal.id, animal);
    this.history.push(initialStatus);
  }
  async update(animal: Animal) {
    this.rows.set(animal.id, animal);
  }
  async delete(id: string) {
    this.rows.delete(id);
  }
  async statusHistory(animalId: string) {
    return this.history.filter((h) => h.animalId === animalId);
  }
}

export const fakeHasher: PasswordHasher = {
  generateSalt: async () => 'salt',
  hash: async (password, salt) => `${salt}:${password}`,
};

export class FakeSessionStore implements SessionStore {
  userId: string | null = null;
  async getUserId() {
    return this.userId;
  }
  async setUserId(userId: string) {
    this.userId = userId;
  }
  async clear() {
    this.userId = null;
  }
}

export function sequentialIds(): IdGenerator {
  let counter = 0;
  return { next: () => `id-${++counter}` };
}

export const fixedClock: Clock = { nowIso: () => '2026-09-14T12:00:00.000Z' };

export function makeUser(role: UserRole, overrides: Partial<User> = {}): User {
  return {
    id: `${role}-1`,
    name: `Usuário ${role}`,
    email: `${role}@teste.com`,
    phone: null,
    role,
    createdAt: fixedClock.nowIso(),
    updatedAt: fixedClock.nowIso(),
    ...overrides,
  };
}

export async function insertUser(repo: InMemoryUserRepository, user: User, password = 'senha123') {
  await repo.create({ ...user, passwordSalt: 'salt', passwordHash: await fakeHasher.hash(password, 'salt') });
}

export const validAnimalInput = {
  name: 'Paçoca',
  species: 'cachorro',
  size: 'medio',
  sex: 'femea',
  ageMonths: 24,
  temperament: 'docil',
  description: 'Cachorra caramelo encontrada na praça.',
  healthNotes: '',
  photoUri: null,
  latitude: null,
  longitude: null,
};
