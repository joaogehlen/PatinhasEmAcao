import type { Animal, AnimalStatus, AnimalStatusChange } from '@/domain/entities/Animal';
import type { User } from '@/domain/entities/User';
import { DomainError, ForbiddenError, NotFoundError } from '@/domain/errors';
import type { AnimalFilters, AnimalRepository } from '@/domain/repositories/AnimalRepository';
import { hasPermission } from '@/domain/rules/permissions';

import type { Clock, IdGenerator } from '../ports';
import { animalInputSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

export class AnimalService {
  constructor(
    private readonly animals: AnimalRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  list(filters?: AnimalFilters): Promise<Animal[]> {
    return this.animals.list(filters);
  }

  async getById(id: string): Promise<Animal> {
    const animal = await this.animals.findById(id);
    if (!animal) throw new NotFoundError('Animal', id);
    return animal;
  }

  statusHistory(animalId: string): Promise<AnimalStatusChange[]> {
    return this.animals.statusHistory(animalId);
  }

  /**
   * Moradores registram animais sempre como "denunciado".
   * Voluntários e admins podem cadastrar direto em outro status
   * (ex.: animal já resgatado sendo incluído no catálogo).
   */
  async create(actor: User, input: unknown, initialStatus: AnimalStatus = 'denunciado'): Promise<Animal> {
    if (!hasPermission(actor, 'animal:create')) throw new ForbiddenError();
    if (initialStatus !== 'denunciado' && !hasPermission(actor, 'animal:changeStatus')) {
      throw new ForbiddenError('Apenas voluntários podem definir o status inicial.');
    }

    const data = validate(animalInputSchema, input);
    const now = this.clock.nowIso();
    const animal: Animal = {
      ...data,
      id: this.ids.next(),
      status: initialStatus,
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now,
    };
    const history: AnimalStatusChange = {
      id: this.ids.next(),
      animalId: animal.id,
      fromStatus: null,
      toStatus: initialStatus,
      note: 'Cadastro inicial',
      changedBy: actor.id,
      changedAt: now,
    };

    await this.animals.create(animal, history);
    return animal;
  }

  async update(actor: User, id: string, input: unknown): Promise<Animal> {
    const current = await this.getById(id);
    if (!this.canEdit(actor, current)) throw new ForbiddenError();

    const data = validate(animalInputSchema, input);
    const updated: Animal = { ...current, ...data, updatedAt: this.clock.nowIso() };
    await this.animals.update(updated);
    return updated;
  }

  async delete(actor: User, id: string): Promise<void> {
    if (!hasPermission(actor, 'animal:delete')) throw new ForbiddenError();
    const current = await this.getById(id);
    if (current.status === 'adotado') {
      throw new DomainError('Animais adotados ficam no histórico e não podem ser excluídos.');
    }
    await this.animals.delete(id);
  }

  /** Voluntários/admins editam qualquer animal; o denunciante edita a própria denúncia enquanto não houver resgate. */
  canEdit(actor: User | null, animal: Animal): boolean {
    if (!actor) return false;
    if (hasPermission(actor, 'animal:update')) return true;
    return animal.createdBy === actor.id && animal.status === 'denunciado';
  }
}
