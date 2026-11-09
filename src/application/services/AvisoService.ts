import type { Aviso } from '@/domain/entities/Aviso';
import type { User } from '@/domain/entities/User';
import type { AvisoRepository } from '@/domain/repositories/AvisoRepository';
import { hasPermission } from '@/domain/rules/permissions';

import type { Clock } from '../ports';

/**
 * Central de avisos. Os avisos nascem no banco (migração 0010); aqui só se lê
 * e marca como lido.
 *
 * O visitante que ainda não denunciou não tem sessão nem id: para ele a lista
 * é vazia, sem ida ao servidor.
 */
export class AvisoService {
  constructor(
    private readonly avisos: AvisoRepository,
    private readonly clock: Clock,
  ) {}

  async list(actor: User): Promise<Aviso[]> {
    if (!this.canSee(actor)) return [];
    return this.avisos.list(actor.id);
  }

  async countUnread(actor: User): Promise<number> {
    if (!this.canSee(actor)) return 0;
    return this.avisos.countUnread(actor.id);
  }

  async markRead(actor: User, ids: readonly string[]): Promise<void> {
    if (!this.canSee(actor) || ids.length === 0) return;
    await this.avisos.markRead(ids, this.clock.nowIso());
  }

  async markAllRead(actor: User): Promise<void> {
    if (!this.canSee(actor)) return;
    await this.avisos.markAllRead(actor.id, this.clock.nowIso());
  }

  private canSee(actor: User): boolean {
    return actor.id !== '' && hasPermission(actor, 'aviso:view');
  }
}
