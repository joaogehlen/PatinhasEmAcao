/**
 * Campanha de arrecadação da ONG.
 *
 * É informativa por decisão de produto: o app publica meta, chave PIX e quanto
 * já foi arrecadado, e o doador paga pelo banco dele. Nenhum dinheiro passa
 * pelo aplicativo e nenhuma doação é confirmada por ele — `raisedCents` é
 * digitado pela ONG.
 *
 * Valores em centavos, como inteiro. Dinheiro em ponto flutuante acumula erro
 * de arredondamento.
 */
export interface Vaquinha {
  id: string;
  title: string;
  description: string;
  goalCents: number;
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

/** Campos que o administrador informa; id e datas são do banco. */
export type VaquinhaInput = Pick<
  Vaquinha,
  'title' | 'description' | 'goalCents' | 'raisedCents' | 'pixKey' | 'animalId' | 'active'
>;

/** Progresso em 0–1, limitado a 1: arrecadar além da meta não estoura a barra. */
export function vaquinhaProgress(vaquinha: Pick<Vaquinha, 'goalCents' | 'raisedCents'>): number {
  if (vaquinha.goalCents <= 0) return 0;
  return Math.min(1, vaquinha.raisedCents / vaquinha.goalCents);
}
