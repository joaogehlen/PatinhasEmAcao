import type { AdocaoStatus } from '../entities/Adocao';

/**
 * Avaliação do pedido de adoção. Espelho no banco:
 * public.can_transition_adocao, em supabase/migrations/0009_adocoes.sql.
 */
const TRANSITIONS: Record<AdocaoStatus, readonly AdocaoStatus[]> = {
  enviada: ['em_analise'],
  em_analise: ['aprovada', 'recusada'],
  aprovada: [],
  recusada: [],
};

export function allowedNextAdocaoStatuses(current: AdocaoStatus): readonly AdocaoStatus[] {
  return TRANSITIONS[current];
}

export function canTransitionAdocao(from: AdocaoStatus, to: AdocaoStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
