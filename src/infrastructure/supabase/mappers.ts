import type { Adocao } from '@/domain/entities/Adocao';
import type { Animal, AnimalStatusChange } from '@/domain/entities/Animal';
import type { Aviso } from '@/domain/entities/Aviso';
import type { Noticia } from '@/domain/entities/Noticia';
import type { User } from '@/domain/entities/User';
import type { Vaquinha, VaquinhaEntrada } from '@/domain/entities/Vaquinha';
import { ConflictError, DomainError, ForbiddenError, NotFoundError, OfflineError } from '@/domain/errors';

import type {
  AdocaoDetalheRow,
  AdocaoInsert,
  AnimalInsert,
  AnimalRow,
  AnimalStatusHistoryRow,
  AvisoRow,
  NoticiaInsert,
  NoticiaRow,
  ProfileRow,
  VaquinhaEntradaInsert,
  VaquinhaEntradaRow,
  VaquinhaInsert,
  VaquinhaRow,
} from './types';

/**
 * Conversão entre as linhas do Postgres (snake_case) e as entidades de domínio
 * (camelCase). Fica isolado aqui para que nenhuma outra camada precise saber o
 * formato do banco.
 */

/**
 * `isGuest` não vem da tabela: ele é propriedade da sessão, lido de
 * `is_anonymous` no token. Uma mesma linha de perfil é convidado enquanto a
 * sessão é anônima e deixa de ser quando a conta é confirmada.
 */
export function toUser(row: ProfileRow, isGuest = false): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isGuest,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAnimal(row: AnimalRow): Animal {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    size: row.size,
    sex: row.sex,
    ageMonths: row.age_months,
    temperament: row.temperament,
    description: row.description,
    healthNotes: row.health_notes,
    status: row.status,
    photoUri: row.photo_uri,
    latitude: row.latitude,
    longitude: row.longitude,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromAnimal(animal: Animal): AnimalInsert {
  return {
    id: animal.id,
    name: animal.name,
    species: animal.species,
    size: animal.size,
    sex: animal.sex,
    age_months: animal.ageMonths,
    temperament: animal.temperament,
    description: animal.description,
    health_notes: animal.healthNotes,
    status: animal.status,
    photo_uri: animal.photoUri,
    latitude: animal.latitude,
    longitude: animal.longitude,
    created_by: animal.createdBy,
  };
}

export function toVaquinha(row: VaquinhaRow): Vaquinha {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    details: row.details,
    coverUri: row.cover_uri,
    photoUris: row.photo_uris ?? [],
    goalCents: row.goal_cents,
    // bigint no banco; chega como número pelo PostgREST.
    raisedCents: Number(row.raised_cents),
    pixKey: row.pix_key,
    animalId: row.animal_id,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromVaquinha(vaquinha: Vaquinha): VaquinhaInsert {
  return {
    id: vaquinha.id,
    title: vaquinha.title,
    description: vaquinha.description,
    details: vaquinha.details,
    cover_uri: vaquinha.coverUri,
    photo_uris: vaquinha.photoUris,
    goal_cents: vaquinha.goalCents,
    pix_key: vaquinha.pixKey,
    animal_id: vaquinha.animalId,
    active: vaquinha.active,
    created_by: vaquinha.createdBy,
  };
}

export function toVaquinhaEntrada(row: VaquinhaEntradaRow): VaquinhaEntrada {
  return {
    id: row.id,
    vaquinhaId: row.vaquinha_id,
    amountCents: row.amount_cents,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function fromVaquinhaEntrada(entrada: VaquinhaEntrada): VaquinhaEntradaInsert {
  return {
    id: entrada.id,
    vaquinha_id: entrada.vaquinhaId,
    amount_cents: entrada.amountCents,
    note: entrada.note,
    created_by: entrada.createdBy,
  };
}

export function toStatusChange(
  row: AnimalStatusHistoryRow & { changed_by_name?: string | null; changed_by_avatar?: string | null },
): AnimalStatusChange {
  return {
    id: row.id,
    animalId: row.animal_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    changedBy: row.changed_by,
    changedByName: row.changed_by_name ?? null,
    changedByAvatar: row.changed_by_avatar ?? null,
    changedAt: row.changed_at,
  };
}

export function toNoticia(row: NoticiaRow): Noticia {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    coverUri: row.cover_uri,
    photoUris: row.photo_uris ?? [],
    animalId: row.animal_id,
    vaquinhaId: row.vaquinha_id,
    pinned: row.pinned,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromNoticia(noticia: Noticia): NoticiaInsert {
  return {
    id: noticia.id,
    title: noticia.title,
    body: noticia.body,
    cover_uri: noticia.coverUri,
    photo_uris: noticia.photoUris,
    animal_id: noticia.animalId,
    vaquinha_id: noticia.vaquinhaId,
    pinned: noticia.pinned,
    created_by: noticia.createdBy,
  };
}

export function toAdocao(row: AdocaoDetalheRow): Adocao {
  return {
    id: row.id,
    animalId: row.animal_id,
    requesterId: row.requester_id,
    housing: row.housing,
    hasYard: row.has_yard,
    otherAnimals: row.other_animals,
    hasChildren: row.has_children,
    experience: row.experience,
    reason: row.reason,
    status: row.status,
    reviewNote: row.review_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    requesterName: row.requester_name,
    requesterPhone: row.requester_phone,
    requesterEmail: row.requester_email,
    requesterAvatar: row.requester_avatar,
    animalName: row.animal_name,
    animalPhoto: row.animal_photo,
  };
}

export function fromAdocao(adocao: Adocao): AdocaoInsert {
  return {
    id: adocao.id,
    animal_id: adocao.animalId,
    requester_id: adocao.requesterId,
    housing: adocao.housing,
    has_yard: adocao.hasYard,
    other_animals: adocao.otherAnimals,
    has_children: adocao.hasChildren,
    experience: adocao.experience,
    reason: adocao.reason,
    status: adocao.status,
    review_note: adocao.reviewNote,
  };
}

export function toAviso(row: AvisoRow): Aviso {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    animalId: row.animal_id,
    adocaoId: row.adocao_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/** Códigos que o Postgres/PostgREST devolvem e que têm um erro de domínio equivalente. */
const POSTGREST_CODES: Record<string, (message: string) => DomainError> = {
  // violação de unique: o nome do índice no texto diz qual regra foi.
  '23505': (message) =>
    message.includes('adocoes_um_aberto')
      ? new ConflictError('Você já tem um pedido aberto para este animal.')
      : message.includes('noticias_uma_fixada')
        ? new ConflictError('Outra notícia foi fixada ao mesmo tempo. Tente de novo.')
        : new ConflictError('Já existe uma conta com este e-mail.'),
  // Violação de RLS: quem recusou foi o servidor, não o app. A distinção
  // importa no diagnóstico — a mesma frase nos dois lados esconde a origem.
  '42501': () => new ForbiddenError('O servidor recusou a operação: regra de acesso do banco.'),
  '42P17': () => new ForbiddenError('O servidor recusou a operação: regra de acesso do banco.'),
  // nenhuma linha retornada por .single()
  PGRST116: () => new NotFoundError('Registro', ''),
};

/**
 * Traduz o erro do PostgREST para a linguagem do domínio.
 *
 * As mensagens dos triggers (`raise exception`) já são escritas em português e
 * voltam no campo `message`; repassamos como DomainError para que a tela as
 * mostre direto, que é o que as telas já fazem com describeError.
 */
export function translateError(error: { code?: string; message: string } | null): never {
  if (!error) throw new DomainError('Erro desconhecido na comunicação com o servidor.');

  const known = error.code ? POSTGREST_CODES[error.code] : undefined;
  if (known) throw known(error.message);

  // P0001 é o código de `raise exception` em PL/pgSQL: são as nossas guardas.
  if (error.code === 'P0001') throw new DomainError(error.message);

  if (isOffline(error.message)) throw new OfflineError(OFFLINE_MESSAGE);

  throw new DomainError(error.message);
}

/**
 * Falha de rede, nas várias formas em que ela chega.
 *
 * Cada plataforma embrulha isso de um jeito: o Android devolve
 * `UnknownHostException` dentro de um "fetch failed", o iOS devolve "Network
 * request failed", e o navegador "Failed to fetch". Checar só uma delas fazia
 * o app mostrar um stack trace de Java para quem está sem sinal na rua.
 */
export function isOffline(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('network request failed') ||
    lower.includes('fetch failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('unknownhostexception') ||
    lower.includes('unable to resolve host') ||
    lower.includes('network error') ||
    lower.includes('timeout')
  );
}

export const OFFLINE_MESSAGE = 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
