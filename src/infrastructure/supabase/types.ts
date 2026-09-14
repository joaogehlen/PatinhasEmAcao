import type {
  AnimalSex,
  AnimalSize,
  AnimalSpecies,
  AnimalStatus,
  AnimalTemperament,
} from '@/domain/entities/Animal';
import type { UserRole } from '@/domain/entities/User';

/**
 * Tipos das tabelas do Supabase, escritos à mão a partir de
 * supabase/migrations/0001_init.sql.
 *
 * Os enums reaproveitam os tipos do domínio de propósito: se alguém adicionar
 * uma espécie em domain/entities/Animal.ts sem criar a migração correspondente,
 * o TypeScript não reclama, mas o Postgres rejeita a escrita. O contrário —
 * migração sem o tipo — quebra a compilação aqui. Rode `npm run typecheck`
 * depois de mexer em qualquer um dos dois.
 *
 * Tudo aqui é `type`, nunca `interface`: o postgrest-js exige que o schema
 * satisfaça `Record<string, …>`, e interface não ganha index signature
 * implícita. Com `interface`, o schema inteiro degrada para `never` e todo
 * insert/update passa a acusar erro de tipo.
 *
 * Para regenerar a partir do banco real:
 *   npx supabase gen types typescript --project-id <id> > src/infrastructure/supabase/types.ts
 */

export type ProfileRow = {
  id: string;
  name: string;
  /** null no convidado: sessão anônima não tem e-mail (migração 0002). */
  email: string | null;
  phone: string | null;
  role: UserRole;
  /** Exclusão lógica (migração 0004). Linhas preenchidas somem das consultas. */
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AnimalRow = {
  id: string;
  name: string;
  species: AnimalSpecies;
  size: AnimalSize;
  sex: AnimalSex;
  age_months: number | null;
  temperament: AnimalTemperament | null;
  description: string;
  health_notes: string | null;
  status: AnimalStatus;
  photo_uri: string | null;
  latitude: number | null;
  longitude: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VaquinhaRow = {
  id: string;
  title: string;
  description: string;
  goal_cents: number;
  raised_cents: number;
  pix_key: string | null;
  animal_id: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AnimalStatusHistoryRow = {
  id: string;
  animal_id: string;
  from_status: AnimalStatus | null;
  to_status: AnimalStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
};

/**
 * Colunas que o cliente escreve. created_at e updated_at ficam de fora: são
 * do banco. O id vai junto porque os serviços já geram o UUID antes de gravar.
 */
export type AnimalInsert = Omit<AnimalRow, 'created_at' | 'updated_at'>;
export type AnimalUpdate = Partial<Omit<AnimalRow, 'id' | 'created_at' | 'updated_at' | 'created_by'>>;
export type ProfileUpdate = Partial<Pick<ProfileRow, 'name' | 'phone' | 'role' | 'deleted_at'>>;
export type StatusHistoryInsert = Omit<AnimalStatusHistoryRow, 'id' | 'changed_at'>;
export type VaquinhaInsert = Omit<VaquinhaRow, 'created_at' | 'updated_at'>;
export type VaquinhaUpdate = Partial<Omit<VaquinhaRow, 'id' | 'created_at' | 'updated_at' | 'created_by'>>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        // Na prática o cliente nunca insere: perfis nascem pelo trigger
        // on_auth_user_created e não há policy de INSERT. O tipo existe porque
        // o postgrest-js exige um Record aqui para reconhecer a tabela.
        Insert: ProfileRow;
        Update: ProfileUpdate;
        Relationships: [];
      };
      animals: {
        Row: AnimalRow;
        Insert: AnimalInsert;
        Update: AnimalUpdate;
        Relationships: [];
      };
      animal_status_history: {
        Row: AnimalStatusHistoryRow;
        Insert: StatusHistoryInsert;
        // Sem policy de UPDATE: a trilha é imutável. Mesma ressalva do Insert
        // de profiles — o tipo precisa existir, a permissão é que não.
        Update: Partial<StatusHistoryInsert>;
        Relationships: [];
      };
      vaquinhas: {
        Row: VaquinhaRow;
        Insert: VaquinhaInsert;
        Update: VaquinhaUpdate;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      auth_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      can_transition: {
        Args: { from_status: AnimalStatus; to_status: AnimalStatus };
        Returns: boolean;
      };
      is_guest: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      soft_delete_user: {
        Args: { target_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      animal_species: AnimalSpecies;
      animal_size: AnimalSize;
      animal_sex: AnimalSex;
      animal_temperament: AnimalTemperament;
      animal_status: AnimalStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
