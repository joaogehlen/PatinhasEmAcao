export const ANIMAL_SPECIES = ['cachorro', 'gato', 'outro'] as const;
export type AnimalSpecies = (typeof ANIMAL_SPECIES)[number];

export const ANIMAL_SIZES = ['pequeno', 'medio', 'grande'] as const;
export type AnimalSize = (typeof ANIMAL_SIZES)[number];

export const ANIMAL_SEXES = ['macho', 'femea', 'desconhecido'] as const;
export type AnimalSex = (typeof ANIMAL_SEXES)[number];

export const ANIMAL_TEMPERAMENTS = ['docil', 'brincalhao', 'timido', 'agitado', 'protetor'] as const;
export type AnimalTemperament = (typeof ANIMAL_TEMPERAMENTS)[number];

/** Fluxo da timeline descrito na proposta: Denunciado → Resgate → Tratamento → Adoção. */
export const ANIMAL_STATUSES = ['denunciado', 'resgatado', 'em_tratamento', 'disponivel', 'adotado'] as const;
export type AnimalStatus = (typeof ANIMAL_STATUSES)[number];

export const SPECIES_LABELS: Record<AnimalSpecies, string> = {
  cachorro: 'Cachorro',
  gato: 'Gato',
  outro: 'Outro',
};

export const SIZE_LABELS: Record<AnimalSize, string> = {
  pequeno: 'Pequeno',
  medio: 'Médio',
  grande: 'Grande',
};

export const SEX_LABELS: Record<AnimalSex, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
  desconhecido: 'Não informado',
};

export const TEMPERAMENT_LABELS: Record<AnimalTemperament, string> = {
  docil: 'Dócil',
  brincalhao: 'Brincalhão',
  timido: 'Tímido',
  agitado: 'Agitado',
  protetor: 'Protetor',
};

export const STATUS_LABELS: Record<AnimalStatus, string> = {
  denunciado: 'Denunciado',
  resgatado: 'Resgatado',
  em_tratamento: 'Em tratamento',
  disponivel: 'Disponível para adoção',
  adotado: 'Adotado',
};

export interface Animal {
  id: string;
  name: string;
  species: AnimalSpecies;
  size: AnimalSize;
  sex: AnimalSex;
  /** Idade aproximada em meses; null quando desconhecida. */
  ageMonths: number | null;
  temperament: AnimalTemperament | null;
  description: string;
  /** Observações de saúde (vacinas, castração, medicação). */
  healthNotes: string | null;
  status: AnimalStatus;
  /** URI local da foto (Sprint 1); passa a ser URL do Storage quando houver backend. */
  photoUri: string | null;
  /** Coordenadas ficam no modelo desde já; captura via GPS entra na Sprint 2. */
  latitude: number | null;
  longitude: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Entrada da timeline de status do animal. */
export interface AnimalStatusChange {
  id: string;
  animalId: string;
  fromStatus: AnimalStatus | null;
  toStatus: AnimalStatus;
  note: string | null;
  changedBy: string;
  changedAt: string;
}
