import type { Aviso } from '../entities/Aviso';

/** Sempre os avisos de quem está logado: a RLS não deixa ver os dos outros. */
export interface AvisoRepository {
  /** Mais recentes primeiro. */
  list(userId: string): Promise<Aviso[]>;
  countUnread(userId: string): Promise<number>;
  markRead(ids: readonly string[], at: string): Promise<void>;
  markAllRead(userId: string, at: string): Promise<void>;
}
