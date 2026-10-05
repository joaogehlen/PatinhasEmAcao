import type { Vaquinha, VaquinhaEntrada } from '../entities/Vaquinha';

export interface VaquinhaFilters {
  /** Só campanhas abertas. Administradores veem as encerradas também. */
  activeOnly?: boolean;
  animalId?: string;
}

export interface VaquinhaRepository {
  /** Abertas primeiro, depois as mais recentes. */
  list(filters?: VaquinhaFilters): Promise<Vaquinha[]>;
  findById(id: string): Promise<Vaquinha | null>;
  /** Grava tudo menos o arrecadado, que é a soma das entradas. */
  create(vaquinha: Vaquinha): Promise<void>;
  update(vaquinha: Vaquinha): Promise<void>;
  delete(id: string): Promise<void>;
  /** Mais recentes primeiro. */
  listEntradas(vaquinhaId: string): Promise<VaquinhaEntrada[]>;
  /** Grava a entrada; o arrecadado da vaquinha é recalculado junto. */
  addEntrada(entrada: VaquinhaEntrada): Promise<void>;
  deleteEntrada(id: string): Promise<void>;
}
