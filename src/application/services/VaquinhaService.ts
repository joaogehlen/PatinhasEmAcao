import type { User } from '@/domain/entities/User';
import type { Vaquinha } from '@/domain/entities/Vaquinha';
import { ForbiddenError, NotFoundError } from '@/domain/errors';
import type { VaquinhaFilters, VaquinhaRepository } from '@/domain/repositories/VaquinhaRepository';
import { hasPermission } from '@/domain/rules/permissions';

import type { Clock, IdGenerator } from '../ports';
import { vaquinhaInputSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

export class VaquinhaService {
  constructor(
    private readonly vaquinhas: VaquinhaRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * Quem não administra vê só campanha aberta. A RLS aplica a mesma regra no
   * servidor; aqui ela evita a ida desnecessária e a lista meio vazia.
   */
  async list(actor: User, filters: VaquinhaFilters = {}): Promise<Vaquinha[]> {
    if (!hasPermission(actor, 'vaquinha:view')) throw new ForbiddenError();
    const activeOnly = filters.activeOnly ?? !hasPermission(actor, 'vaquinha:manage');
    return this.vaquinhas.list({ ...filters, activeOnly });
  }

  async getById(actor: User, id: string): Promise<Vaquinha> {
    if (!hasPermission(actor, 'vaquinha:view')) throw new ForbiddenError();
    const vaquinha = await this.vaquinhas.findById(id);
    if (!vaquinha) throw new NotFoundError('Vaquinha', id);
    return vaquinha;
  }

  async create(actor: User, input: unknown): Promise<Vaquinha> {
    this.require(actor);
    const data = validate(vaquinhaInputSchema, input);
    const now = this.clock.nowIso();
    const vaquinha: Vaquinha = {
      ...data,
      id: this.ids.next(),
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now,
    };
    await this.vaquinhas.create(vaquinha);
    return vaquinha;
  }

  async update(actor: User, id: string, input: unknown): Promise<Vaquinha> {
    this.require(actor);
    const current = await this.getById(actor, id);
    const data = validate(vaquinhaInputSchema, input);
    const updated: Vaquinha = { ...current, ...data, updatedAt: this.clock.nowIso() };
    await this.vaquinhas.update(updated);
    return updated;
  }

  async delete(actor: User, id: string): Promise<void> {
    this.require(actor);
    await this.getById(actor, id);
    await this.vaquinhas.delete(id);
  }

  private require(actor: User): void {
    if (!hasPermission(actor, 'vaquinha:manage')) throw new ForbiddenError();
  }
}
