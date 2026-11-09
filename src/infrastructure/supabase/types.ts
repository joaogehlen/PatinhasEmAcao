import type {
  AnimalSex,
  AnimalSize,
  AnimalSpecies,
  AnimalStatus,
  AnimalTemperament,
} from '@/domain/entities/Animal';
import type { AdocaoStatus, HousingType } from '@/domain/entities/Adocao';
import type { AvisoKind } from '@/domain/entities/Aviso';
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
  /** Foto de perfil (migração 0007). */
  avatar_url: string | null;
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
  details: string | null;
  cover_uri: string | null;
  photo_uris: string[];
  goal_cents: number;
  /** Soma das entradas, mantida pelo trigger vaquinha_sync_raised (0006). */
  raised_cents: number;
  pix_key: string | null;
  animal_id: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VaquinhaEntradaRow = {
  id: string;
  vaquinha_id: string;
  amount_cents: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
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

export type NoticiaRow = {
  id: string;
  title: string;
  body: string;
  cover_uri: string | null;
  photo_uris: string[];
  animal_id: string | null;
  vaquinha_id: string | null;
  pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdocaoRow = {
  id: string;
  animal_id: string;
  requester_id: string;
  housing: HousingType;
  has_yard: boolean;
  other_animals: string | null;
  has_children: boolean;
  experience: string | null;
  reason: string;
  status: AdocaoStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** View adocoes_detalhe (0009): o pedido com nome e contato de quem pediu. */
export type AdocaoDetalheRow = AdocaoRow & {
  requester_name: string | null;
  requester_phone: string | null;
  requester_email: string | null;
  requester_avatar: string | null;
  animal_name: string | null;
  animal_photo: string | null;
};

export type AvisoRow = {
  id: string;
  user_id: string;
  kind: AvisoKind;
  title: string;
  body: string;
  animal_id: string | null;
  adocao_id: string | null;
  read_at: string | null;
  created_at: string;
};

/**
 * Colunas que o cliente escreve. created_at e updated_at ficam de fora: são
 * do banco. O id vai junto porque os serviços já geram o UUID antes de gravar.
 */
export type AnimalInsert = Omit<AnimalRow, 'created_at' | 'updated_at'>;
export type AnimalUpdate = Partial<Omit<AnimalRow, 'id' | 'created_at' | 'updated_at' | 'created_by'>> & {
  /** Campo de passagem: o trigger copia para o histórico e zera (0006). */
  status_note?: string | null;
};
export type ProfileUpdate = Partial<Pick<ProfileRow, 'name' | 'phone' | 'role' | 'deleted_at' | 'avatar_url'>>;
export type StatusHistoryInsert = Omit<AnimalStatusHistoryRow, 'id' | 'changed_at'>;
/** raised_cents fica de fora: quem escreve é o trigger, a partir das entradas. */
export type VaquinhaInsert = Omit<VaquinhaRow, 'created_at' | 'updated_at' | 'raised_cents'>;
export type VaquinhaUpdate = Partial<Omit<VaquinhaInsert, 'id' | 'created_by'>>;
export type VaquinhaEntradaInsert = Omit<VaquinhaEntradaRow, 'created_at'>;
export type NoticiaInsert = Omit<NoticiaRow, 'created_at' | 'updated_at'>;
export type NoticiaUpdate = Partial<Omit<NoticiaInsert, 'id' | 'created_by'>>;
/** Quem avaliou e quando são carimbados pelo trigger guard_adocao. */
export type AdocaoInsert = Omit<AdocaoRow, 'created_at' | 'updated_at' | 'reviewed_by' | 'reviewed_at'>;
export type AdocaoUpdate = Partial<Pick<AdocaoRow, 'status' | 'review_note'>>;
/** Avisos nascem nos triggers; o cliente só marca como lido. */
export type AvisoUpdate = Partial<Pick<AvisoRow, 'read_at'>>;

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
      vaquinha_entradas: {
        Row: VaquinhaEntradaRow;
        Insert: VaquinhaEntradaInsert;
        // Sem policy de UPDATE: lançamento errado é removido e lançado de novo.
        Update: Partial<VaquinhaEntradaInsert>;
        Relationships: [];
      };
      noticias: {
        Row: NoticiaRow;
        Insert: NoticiaInsert;
        Update: NoticiaUpdate;
        Relationships: [];
      };
      adocoes: {
        Row: AdocaoRow;
        Insert: AdocaoInsert;
        Update: AdocaoUpdate;
        Relationships: [];
      };
      avisos: {
        Row: AvisoRow;
        // Sem policy de INSERT: o tipo existe porque o postgrest-js exige.
        Insert: AvisoRow;
        Update: AvisoUpdate;
        Relationships: [];
      };
    };
    Views: {
      adocoes_detalhe: {
        Row: AdocaoDetalheRow;
        Relationships: [];
      };
    };
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
      animal_history: {
        Args: { target_animal: string };
        Returns: (AnimalStatusHistoryRow & { changed_by_name: string | null; changed_by_avatar: string | null })[];
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
      adocao_status: AdocaoStatus;
      animal_temperament: AnimalTemperament;
      animal_status: AnimalStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
