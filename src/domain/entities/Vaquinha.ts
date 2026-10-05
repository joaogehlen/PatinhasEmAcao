/**
 * Campanha de arrecadação da ONG.
 *
 * É informativa por decisão de produto: o app publica meta, chave PIX e quanto
 * já foi arrecadado, e o doador paga pelo banco dele. Nenhum dinheiro passa
 * pelo aplicativo e nenhuma doação é confirmada por ele — o arrecadado é a
 * soma das entradas que a ONG lança (VaquinhaEntrada).
 *
 * Valores em centavos, como inteiro. Dinheiro em ponto flutuante acumula erro
 * de arredondamento.
 */
export interface Vaquinha {
  id: string;
  title: string;
  /** Resumo curto, exibido no card da lista. */
  description: string;
  /** Texto longo da página da campanha: o que é, para que serve, como está. */
  details: string | null;
  coverUri: string | null;
  /** Galeria: fotos dos animais, do tratamento, da obra. Até MAX_VAQUINHA_PHOTOS. */
  photoUris: string[];
  goalCents: number;
  /** Soma das entradas. Mantido pelo banco; o app nunca grava este número. */
  raisedCents: number;
  /** Chave PIX da ONG, copiável na tela. null enquanto a ONG não informar. */
  pixKey: string | null;
  /** Vaquinha de um animal específico, ou null quando é da ONG em geral. */
  animalId: string | null;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Campos que o administrador informa; id, datas e arrecadado são do banco. */
export type VaquinhaInput = Pick<
  Vaquinha,
  'title' | 'description' | 'details' | 'coverUri' | 'photoUris' | 'goalCents' | 'pixKey' | 'animalId' | 'active'
>;

/** Um lançamento de valor arrecadado, digitado pela ONG. */
export interface VaquinhaEntrada {
  id: string;
  vaquinhaId: string;
  amountCents: number;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export const MAX_VAQUINHA_PHOTOS = 10;

/** Progresso em 0–1, limitado a 1: arrecadar além da meta não estoura a barra. */
export function vaquinhaProgress(vaquinha: Pick<Vaquinha, 'goalCents' | 'raisedCents'>): number {
  if (vaquinha.goalCents <= 0) return 0;
  return Math.min(1, vaquinha.raisedCents / vaquinha.goalCents);
}

/** Quanto falta para a meta; 0 quando já foi atingida. */
export function vaquinhaRemaining(vaquinha: Pick<Vaquinha, 'goalCents' | 'raisedCents'>): number {
  return Math.max(0, vaquinha.goalCents - vaquinha.raisedCents);
}
