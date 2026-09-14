import { STATUS_LABELS, type Animal, type AnimalStatus, type AnimalStatusChange } from '@/domain/entities/Animal';
import type { User } from '@/domain/entities/User';
import { DomainError, ForbiddenError, NotFoundError } from '@/domain/errors';
import type { AnimalFilters, AnimalRepository } from '@/domain/repositories/AnimalRepository';
import { allowedNextStatuses, canTransition } from '@/domain/rules/animalStatus';
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

  /**
   * Avança a jornada do animal.
   *
   * A transição é validada aqui e de novo pelo trigger no banco, que também
   * grava a linha da timeline. Duplicidade proposital: a checagem daqui dá
   * mensagem boa e evita a ida à rede; a do banco é a que não dá para burlar.
   */
  async changeStatus(actor: User, id: string, toStatus: AnimalStatus): Promise<Animal> {
    if (!hasPermission(actor, 'animal:changeStatus')) throw new ForbiddenError();

    const current = await this.getById(id);
    if (current.status === toStatus) return current;
    if (!canTransition(current.status, toStatus)) {
      throw new DomainError(
        `Não dá para ir de "${STATUS_LABELS[current.status]}" para "${STATUS_LABELS[toStatus]}".`,
      );
    }

    const updated: Animal = { ...current, status: toStatus, updatedAt: this.clock.nowIso() };
    await this.animals.update(updated);
    return updated;
  }

  /** Estados para os quais este animal pode ir agora. Vazio para quem não pode mudar. */
  allowedNextStatuses(actor: User | null, animal: Animal): readonly AnimalStatus[] {
    if (!hasPermission(actor, 'animal:changeStatus')) return [];
    return allowedNextStatuses(animal.status);
  }

  async delete(actor: User, id: string): Promise<void> {
    if (!hasPermission(actor, 'animal:delete')) throw new ForbiddenError();
    const current = await this.getById(id);
    if (current.status === 'adotado') {
      throw new DomainError('Animais adotados ficam no histórico e não podem ser excluídos.');
    }
    await this.animals.delete(id);
  }

  /**
   * Editar animal é do administrador.
   *
   * Até 14/09/2026 o denunciante podia corrigir a própria denúncia enquanto
   * não houvesse resgate. A decisão de concentrar o trabalho de campo no admin
   * tirou isso: o morador registra e acompanha, não edita.
   */
  canEdit(actor: User | null, _animal: Animal): boolean {
    return hasPermission(actor, 'animal:update');
  }
}
