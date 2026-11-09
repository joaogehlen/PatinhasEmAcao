/**
 * Pedido de adoção de um animal disponível.
 *
 * É a avaliação, não o fato: aprovar o pedido não muda a situação do animal.
 * A adoção em si continua registrada pelo fluxo de status do animal.
 */
export const ADOCAO_STATUSES = ['enviada', 'em_analise', 'aprovada', 'recusada'] as const;
export type AdocaoStatus = (typeof ADOCAO_STATUSES)[number];

export const ADOCAO_STATUS_LABELS: Record<AdocaoStatus, string> = {
  enviada: 'Enviado',
  em_analise: 'Em análise',
  aprovada: 'Aprovado',
  recusada: 'Recusado',
};

/** Pedido ainda à espera de decisão: só pode haver um por pessoa e animal. */
export function isAdocaoOpen(status: AdocaoStatus): boolean {
  return status === 'enviada' || status === 'em_analise';
}

export const HOUSING_TYPES = ['casa', 'apartamento', 'sitio'] as const;
export type HousingType = (typeof HOUSING_TYPES)[number];

export const HOUSING_LABELS: Record<HousingType, string> = {
  casa: 'Casa',
  apartamento: 'Apartamento',
  sitio: 'Sítio ou chácara',
};

export interface Adocao {
  id: string;
  animalId: string;
  requesterId: string;
  housing: HousingType;
  hasYard: boolean;
  /** Quais animais já vivem na casa; null quando nenhum. */
  otherAnimals: string | null;
  hasChildren: boolean;
  experience: string | null;
  reason: string;
  status: AdocaoStatus;
  /** Observação do admin na avaliação, enviada no aviso para quem pediu. */
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Dados de exibição, vindos da view adocoes_detalhe. */
  requesterName?: string | null;
  requesterPhone?: string | null;
  requesterEmail?: string | null;
  requesterAvatar?: string | null;
  animalName?: string | null;
  animalPhoto?: string | null;
}

export type AdocaoInput = Pick<Adocao, 'housing' | 'hasYard' | 'otherAnimals' | 'hasChildren' | 'experience' | 'reason'>;
