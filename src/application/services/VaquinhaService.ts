import type { User } from '@/domain/entities/User';
import type { Vaquinha, VaquinhaEntrada } from '@/domain/entities/Vaquinha';
import { DomainError, ForbiddenError, NotFoundError } from '@/domain/errors';
import type { VaquinhaFilters, VaquinhaRepository } from '@/domain/repositories/VaquinhaRepository';
import { hasPermission } from '@/domain/rules/permissions';

import type { Clock, IdGenerator } from '../ports';
import { vaquinhaEntradaSchema, vaquinhaInputSchema } from '../validation/schemas';
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
    // Encerrada é invisível para o morador, como na RLS.
    if (!vaquinha || (!vaquinha.active && !hasPermission(actor, 'vaquinha:manage'))) {
      throw new NotFoundError('Vaquinha', id);
    }
    return vaquinha;
  }

  async create(actor: User, input: unknown): Promise<Vaquinha> {
    this.require(actor);
    const data = validate(vaquinhaInputSchema, input);
    const now = this.clock.nowIso();
    const vaquinha: Vaquinha = {
      ...data,
      id: this.ids.next(),
      raisedCents: 0,
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

  /** Encerrar e reabrir sem passar pelo formulário inteiro. */
  async setActive(actor: User, id: string, active: boolean): Promise<Vaquinha> {
    this.require(actor);
    const current = await this.getById(actor, id);
    const updated: Vaquinha = { ...current, active, updatedAt: this.clock.nowIso() };
    await this.vaquinhas.update(updated);
    return updated;
  }

  async delete(actor: User, id: string): Promise<void> {
    this.require(actor);
    await this.getById(actor, id);
    await this.vaquinhas.delete(id);
  }

  /** Histórico de arrecadação: é público para quem vê a campanha. */
  async entradas(actor: User, vaquinhaId: string): Promise<VaquinhaEntrada[]> {
    await this.getById(actor, vaquinhaId);
    return this.vaquinhas.listEntradas(vaquinhaId);
  }

  /**
   * Lança um valor arrecadado e devolve a vaquinha com o total novo.
   *
   * Campanha encerrada não recebe lançamento: a barra de uma campanha fechada
   * precisa ser o número final. Se chegou dinheiro depois, reabre-se.
   */
  async addEntrada(actor: User, vaquinhaId: string, input: unknown): Promise<Vaquinha> {
    this.require(actor);
    const vaquinha = await this.getById(actor, vaquinhaId);
    if (!vaquinha.active) {
      throw new DomainError('Campanha encerrada. Reabra a vaquinha para lançar novos valores.');
    }
    const data = validate(vaquinhaEntradaSchema, input);
    await this.vaquinhas.addEntrada({
      ...data,
      id: this.ids.next(),
      vaquinhaId,
      createdBy: actor.id,
      createdAt: this.clock.nowIso(),
    });
    return this.getById(actor, vaquinhaId);
  }

  /** Corrige um lançamento errado. O total é recalculado pelo banco. */
  async removeEntrada(actor: User, vaquinhaId: string, entradaId: string): Promise<Vaquinha> {
    this.require(actor);
    const vaquinha = await this.getById(actor, vaquinhaId);
    if (!vaquinha.active) {
      throw new DomainError('Campanha encerrada. Reabra a vaquinha para corrigir lançamentos.');
    }
    const entradas = await this.vaquinhas.listEntradas(vaquinhaId);
    if (!entradas.some((entrada) => entrada.id === entradaId)) {
      throw new NotFoundError('Lançamento', entradaId);
    }
    await this.vaquinhas.deleteEntrada(entradaId);
    return this.getById(actor, vaquinhaId);
  }

  private require(actor: User): void {
    if (!hasPermission(actor, 'vaquinha:manage')) throw new ForbiddenError();
  }
}
