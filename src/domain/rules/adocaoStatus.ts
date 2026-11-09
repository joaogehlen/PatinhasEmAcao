import type { AdocaoStatus } from '../entities/Adocao';

/**
 * Avaliação do pedido de adoção. Espelho no banco:
 * public.can_transition_adocao (0009, ajustada na 0011).
 *
 * Recusar não exige análise: um pedido pode ser descartado direto, e é assim
 * que os outros pedidos abertos são recusados quando o animal é adotado.
 */
const TRANSITIONS: Record<AdocaoStatus, readonly AdocaoStatus[]> = {
  enviada: ['em_analise', 'recusada'],
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
