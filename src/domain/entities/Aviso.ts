/**
 * Aviso dentro do app. Criado pelo banco (triggers da migração 0010), nunca
 * pelo cliente: denúncia nova e pedido de adoção novo avisam os admins;
 * mudança de status avisa quem denunciou; pedido avaliado avisa quem pediu.
 */
export type AvisoKind = 'denuncia_nova' | 'status_animal' | 'adocao_nova' | 'adocao_status';

export interface Aviso {
  id: string;
  userId: string;
  kind: AvisoKind;
  title: string;
  body: string;
  /** Para onde o toque leva. */
  animalId: string | null;
  adocaoId: string | null;
  readAt: string | null;
  createdAt: string;
}
