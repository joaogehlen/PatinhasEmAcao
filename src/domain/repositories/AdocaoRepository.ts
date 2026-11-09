import type { Adocao, AdocaoStatus } from '../entities/Adocao';

export interface AdocaoFilters {
  requesterId?: string;
  animalId?: string;
  statuses?: readonly AdocaoStatus[];
}

export interface AdocaoRepository {
  /** Mais antigos primeiro: a fila é atendida por ordem de chegada. */
  list(filters?: AdocaoFilters): Promise<Adocao[]>;
  findById(id: string): Promise<Adocao | null>;
  create(adocao: Adocao): Promise<void>;
  /** Grava status e observação; quem avaliou e quando são carimbados pelo banco. */
  updateStatus(id: string, status: AdocaoStatus, reviewNote: string | null): Promise<void>;
}
