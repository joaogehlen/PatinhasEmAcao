import type { Vaquinha } from '../entities/Vaquinha';

export interface VaquinhaFilters {
  /** Só campanhas abertas. Administradores veem as encerradas também. */
  activeOnly?: boolean;
  animalId?: string;
}

export interface VaquinhaRepository {
  list(filters?: VaquinhaFilters): Promise<Vaquinha[]>;
  findById(id: string): Promise<Vaquinha | null>;
  create(vaquinha: Vaquinha): Promise<void>;
  update(vaquinha: Vaquinha): Promise<void>;
  delete(id: string): Promise<void>;
}
