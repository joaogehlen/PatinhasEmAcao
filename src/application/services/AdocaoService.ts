import type { Adocao, AdocaoStatus } from '@/domain/entities/Adocao';
import type { User } from '@/domain/entities/User';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '@/domain/errors';
import type { AdocaoRepository } from '@/domain/repositories/AdocaoRepository';
import type { AnimalRepository } from '@/domain/repositories/AnimalRepository';
import { allowedNextAdocaoStatuses, canTransitionAdocao } from '@/domain/rules/adocaoStatus';
import { canTransition } from '@/domain/rules/animalStatus';
import { hasPermission } from '@/domain/rules/permissions';

import type { Clock, IdGenerator } from '../ports';
import { adocaoInputSchema, reviewNoteSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

const OPEN_STATUSES: readonly AdocaoStatus[] = ['enviada', 'em_analise'];

/**
 * Pedidos de adoção. As mesmas regras valem no banco (guard_adocao e o índice
 * adocoes_um_aberto, migração 0009); aqui elas dão a mensagem antes da ida ao
 * servidor.
 */
export class AdocaoService {
  constructor(
    private readonly adocoes: AdocaoRepository,
    private readonly animals: AnimalRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async request(actor: User, animalId: string, input: unknown): Promise<Adocao> {
    if (!hasPermission(actor, 'adocao:request')) throw new ForbiddenError();
    const animal = await this.animals.findById(animalId);
    if (!animal) throw new NotFoundError('Animal', animalId);
    if (animal.status !== 'disponivel') throw new DomainError('Este animal não está disponível para adoção.');
    if (await this.openFor(actor, animalId)) {
      throw new ConflictError('Você já tem um pedido aberto para este animal.');
    }

    const data = validate(adocaoInputSchema, input);
    const now = this.clock.nowIso();
    const adocao: Adocao = {
      ...data,
      id: this.ids.next(),
      animalId,
      requesterId: actor.id,
      status: 'enviada',
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.adocoes.create(adocao);
    return adocao;
  }

  /** Pedidos de quem está logado, mais recentes primeiro. */
  async mine(actor: User): Promise<Adocao[]> {
    if (!hasPermission(actor, 'adocao:request')) throw new ForbiddenError();
    return (await this.adocoes.list({ requesterId: actor.id })).reverse();
  }

  /** Pedido em aberto de quem está logado para este animal, se houver. */
  async openFor(actor: User, animalId: string): Promise<Adocao | null> {
    if (!hasPermission(actor, 'adocao:request')) return null;
    const open = await this.adocoes.list({ requesterId: actor.id, animalId, statuses: OPEN_STATUSES });
    return open[0] ?? null;
  }

  /** Fila do admin: por padrão só os que esperam decisão, por ordem de chegada. */
  async queue(actor: User, statuses: readonly AdocaoStatus[] = OPEN_STATUSES): Promise<Adocao[]> {
    if (!hasPermission(actor, 'adocao:review')) throw new ForbiddenError();
    return this.adocoes.list({ statuses });
  }

  async getById(actor: User, id: string): Promise<Adocao> {
    const adocao = await this.adocoes.findById(id);
    // Pedido de outra pessoa é tratado como inexistente, como faz a RLS.
    if (!adocao || (adocao.requesterId !== actor.id && !hasPermission(actor, 'adocao:review'))) {
      throw new NotFoundError('Pedido de adoção', id);
    }
    return adocao;
  }

  allowedNextStatuses(actor: User | null, adocao: Adocao): readonly AdocaoStatus[] {
    return hasPermission(actor, 'adocao:review') ? allowedNextAdocaoStatuses(adocao.status) : [];
  }

  async changeStatus(actor: User, id: string, next: AdocaoStatus, note?: unknown): Promise<Adocao> {
    if (!hasPermission(actor, 'adocao:review')) throw new ForbiddenError();
    const current = await this.getById(actor, id);
    if (!canTransitionAdocao(current.status, next)) {
      throw new DomainError('Mudança inválida para este pedido.');
    }
    const reviewNote = validate(reviewNoteSchema, note ?? null);
    await this.adocoes.updateStatus(id, next, reviewNote);
    return this.getById(actor, id);
  }

  /**
   * Aprova, marca o animal como adotado e recusa os outros pedidos abertos
   * para ele — o caso comum, num toque. Cada passo deixa o rastro de sempre:
   * o histórico do animal, o aviso a quem denunciou e a quem pediu.
   *
   * Se o animal já não está disponível (outro admin mexeu antes), o pedido é
   * aprovado mesmo assim e a situação do animal fica como está.
   */
  async approveAndAdopt(actor: User, id: string, note?: unknown): Promise<Adocao> {
    const approved = await this.changeStatus(actor, id, 'aprovada', note);

    const animal = await this.animals.findById(approved.animalId);
    if (animal && canTransition(animal.status, 'adotado')) {
      await this.animals.changeStatus(animal.id, 'adotado', 'Pedido de adoção aprovado.');
    }

    const others = await this.adocoes.list({ animalId: approved.animalId, statuses: OPEN_STATUSES });
    for (const other of others) {
      if (other.id === approved.id) continue;
      await this.adocoes.updateStatus(other.id, 'recusada', 'Este animal foi adotado por outra família. Obrigado pelo carinho.');
    }
    return approved;
  }
}
