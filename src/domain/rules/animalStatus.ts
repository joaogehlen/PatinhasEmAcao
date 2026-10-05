import type { AnimalStatus } from '../entities/Animal';

/**
 * Máquina de estados do resgate. Mantida no domínio para que qualquer
 * tela ou serviço aplique as mesmas regras. Espelho no banco:
 * public.can_transition, em supabase/migrations/0001_init.sql.
 */
const TRANSITIONS: Record<AnimalStatus, readonly AnimalStatus[]> = {
  denunciado: ['resgatado'],
  resgatado: ['em_tratamento', 'disponivel'],
  em_tratamento: ['disponivel'],
  disponivel: ['adotado', 'em_tratamento'],
  adotado: ['disponivel'], // adoção devolvida
};

export function allowedNextStatuses(current: AnimalStatus): readonly AnimalStatus[] {
  return TRANSITIONS[current];
}

export function canTransition(from: AnimalStatus, to: AnimalStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
