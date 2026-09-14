import type { AnimalStatus } from '../entities/Animal';

/**
 * Máquina de estados do resgate. Mantida no domínio para que qualquer
 * tela ou serviço aplique as mesmas regras (o fluxo de alteração de
 * status é implementado na Sprint 2, mas a regra já nasce testada).
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
