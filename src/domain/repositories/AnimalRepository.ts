import type {
  Animal,
  AnimalSize,
  AnimalSpecies,
  AnimalStatus,
  AnimalStatusChange,
  AnimalTemperament,
} from '../entities/Animal';

export interface AnimalFilters {
  search?: string;
  species?: AnimalSpecies;
  size?: AnimalSize;
  status?: AnimalStatus;
  temperament?: AnimalTemperament;
}

/** Campos que o usuário informa; id, status e datas são controlados pelo serviço. */
export type AnimalInput = Pick<
  Animal,
  | 'name'
  | 'species'
  | 'size'
  | 'sex'
  | 'ageMonths'
  | 'temperament'
  | 'description'
  | 'healthNotes'
  | 'photoUri'
  | 'latitude'
  | 'longitude'
>;

/**
 * Contrato de persistência. A implementação atual é SQLite; trocar por
 * Firebase na próxima fase exige apenas uma nova classe que implemente isto.
 */
export interface AnimalRepository {
  list(filters?: AnimalFilters): Promise<Animal[]>;
  findById(id: string): Promise<Animal | null>;
  /** Insere o animal e a primeira entrada da timeline de forma atômica. */
  create(animal: Animal, initialStatus: AnimalStatusChange): Promise<void>;
  update(animal: Animal): Promise<void>;
  delete(id: string): Promise<void>;
  statusHistory(animalId: string): Promise<AnimalStatusChange[]>;
}
