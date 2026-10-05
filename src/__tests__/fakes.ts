import type { AuthProvider, Clock, CreateUserInput, IdGenerator, SignUpInput } from '@/application/ports';
import type { Animal, AnimalStatus, AnimalStatusChange } from '@/domain/entities/Animal';
import type { Vaquinha, VaquinhaEntrada } from '@/domain/entities/Vaquinha';
import type { User, UserRole } from '@/domain/entities/User';
import { AuthenticationError, ConflictError } from '@/domain/errors';
import type { AnimalFilters, AnimalRepository } from '@/domain/repositories/AnimalRepository';
import type { UserFilters, UserRepository } from '@/domain/repositories/UserRepository';
import type { VaquinhaFilters, VaquinhaRepository } from '@/domain/repositories/VaquinhaRepository';

/** Implementações em memória para testar os serviços sem Supabase/Expo. */
export class InMemoryUserRepository implements UserRepository {
  readonly rows = new Map<string, User>();

  async list(filters: UserFilters = {}) {
    return [...this.rows.values()].filter((u) => !filters.role || u.role === filters.role);
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async update(user: User) {
    this.rows.set(user.id, { ...this.rows.get(user.id)!, ...user });
  }
  /** Some da consulta, como a policy faz no servidor. */
  async softDelete(id: string, _at: string) {
    this.rows.delete(id);
  }
  async countByRole(role: UserRole) {
    return [...this.rows.values()].filter((u) => u.role === role).length;
  }
}

/**
 * Provedor de autenticação em memória.
 *
 * Guarda as senhas em texto puro de propósito: o teste não deve depender do
 * algoritmo de hash, que agora é do servidor. O que se testa aqui é a regra de
 * aplicação — quem pode fazer o quê — não a criptografia.
 */
export class FakeAuthProvider implements AuthProvider {
  readonly passwords = new Map<string, string>();
  current: User | null = null;
  private counter = 0;
  private readonly listeners = new Set<(user: User | null) => void>();

  constructor(private readonly users: InMemoryUserRepository) {}

  async currentUser() {
    return this.current;
  }

  async signIn(email: string, password: string) {
    const user = this.findByEmail(email);
    if (!user || this.passwords.get(user.id) !== password) throw new AuthenticationError();
    this.setCurrent(user);
    return user;
  }

  async signUp(input: SignUpInput) {
    // Convidado vira conta na mesma linha, preservando o id — é o que mantém
    // as denúncias dele acessíveis depois do cadastro.
    if (this.current?.isGuest) {
      const converted: User = {
        ...this.current,
        name: input.name,
        email: input.email,
        phone: input.phone,
        isGuest: false,
      };
      this.users.rows.set(converted.id, converted);
      this.passwords.set(converted.id, input.password);
      this.setCurrent(converted);
      return converted;
    }

    const user = this.insert({ ...input, role: 'morador' });
    this.setCurrent(user);
    return user;
  }

  async signInAsGuest() {
    const now = fixedClock.nowIso();
    const user: User = {
      id: `guest-${++this.counter}`,
      name: 'Visitante',
      email: null,
      phone: null,
      role: 'morador',
      isGuest: true,
      createdAt: now,
      updatedAt: now,
    };
    this.users.rows.set(user.id, user);
    this.setCurrent(user);
    return user;
  }

  async signOut() {
    this.setCurrent(null);
  }

  async changePassword(currentPassword: string, newPassword: string) {
    if (!this.current) throw new AuthenticationError('Sessão expirada. Entre de novo.');
    if (this.passwords.get(this.current.id) !== currentPassword) {
      throw new AuthenticationError('Senha atual incorreta.');
    }
    this.passwords.set(this.current.id, newPassword);
  }

  /** Criação por admin não troca a sessão de quem criou. */
  async createUser(input: CreateUserInput) {
    return this.insert(input);
  }

  onAuthStateChange(listener: (user: User | null) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private insert(input: CreateUserInput): User {
    if (this.findByEmail(input.email)) throw new ConflictError('Já existe uma conta com este e-mail.');
    const now = fixedClock.nowIso();
    const user: User = {
      id: `auth-${++this.counter}`,
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      isGuest: false,
      createdAt: now,
      updatedAt: now,
    };
    this.users.rows.set(user.id, user);
    this.passwords.set(user.id, input.password);
    return user;
  }

  private findByEmail(email: string): User | undefined {
    // Convidado não tem e-mail; nunca colide com um cadastro real.
    return [...this.users.rows.values()].find((u) => u.email?.toLowerCase() === email.toLowerCase());
  }

  private setCurrent(user: User | null) {
    this.current = user;
    for (const listener of this.listeners) listener(user);
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
  /** Faz o papel do trigger: troca o status e grava a linha do histórico. */
  async changeStatus(id: string, status: AnimalStatus, note: string | null) {
    const current = this.rows.get(id)!;
    this.rows.set(id, { ...current, status });
    this.history.push({
      id: `h-${this.history.length + 1}`,
      animalId: id,
      fromStatus: current.status,
      toStatus: status,
      note,
      changedBy: null,
      changedAt: fixedClock.nowIso(),
    });
  }
  async delete(id: string) {
    this.rows.delete(id);
  }
  async statusHistory(animalId: string) {
    return this.history.filter((h) => h.animalId === animalId);
  }
}

/** O arrecadado é derivado das entradas, como faz o trigger no banco. */
export class InMemoryVaquinhaRepository implements VaquinhaRepository {
  readonly rows = new Map<string, Vaquinha>();
  readonly entradaRows: VaquinhaEntrada[] = [];

  async list(filters: VaquinhaFilters = {}) {
    return [...this.rows.keys()]
      .map((id) => this.withRaised(id))
      .filter((v) => (!filters.activeOnly || v.active) && (!filters.animalId || v.animalId === filters.animalId));
  }
  async findById(id: string) {
    return this.rows.has(id) ? this.withRaised(id) : null;
  }
  async create(vaquinha: Vaquinha) {
    this.rows.set(vaquinha.id, vaquinha);
  }
  async update(vaquinha: Vaquinha) {
    this.rows.set(vaquinha.id, vaquinha);
  }
  async delete(id: string) {
    this.rows.delete(id);
  }
  async listEntradas(vaquinhaId: string) {
    return this.entradaRows.filter((e) => e.vaquinhaId === vaquinhaId).reverse();
  }
  async addEntrada(entrada: VaquinhaEntrada) {
    this.entradaRows.push(entrada);
  }
  async deleteEntrada(id: string) {
    const index = this.entradaRows.findIndex((e) => e.id === id);
    if (index >= 0) this.entradaRows.splice(index, 1);
  }
  private withRaised(id: string): Vaquinha {
    const raisedCents = this.entradaRows.filter((e) => e.vaquinhaId === id).reduce((sum, e) => sum + e.amountCents, 0);
    return { ...this.rows.get(id)!, raisedCents };
  }
}

export const validVaquinhaInput = {
  title: 'Castração coletiva',
  description: 'Mutirão de castração de 20 gatos da praça.',
  details: '',
  coverUri: 'https://exemplo.org/capa.jpg',
  photoUris: ['https://exemplo.org/1.jpg'],
  goalCents: 150_000,
  pixKey: 'pix@patinhas.org',
  animalId: null,
  active: true,
};

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
    isGuest: false,
    createdAt: fixedClock.nowIso(),
    updatedAt: fixedClock.nowIso(),
    ...overrides,
  };
}

/** Sessão anônima: morador sem conta confirmada. */
export function makeGuest(overrides: Partial<User> = {}): User {
  return makeUser('morador', { id: 'guest-1', name: 'Visitante', email: null, isGuest: true, ...overrides });
}

/** Coloca um usuário já existente no repositório e registra sua senha no provedor. */
export function insertUser(
  repo: InMemoryUserRepository,
  provider: FakeAuthProvider,
  user: User,
  password = 'senha123',
): void {
  repo.rows.set(user.id, user);
  provider.passwords.set(user.id, password);
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
