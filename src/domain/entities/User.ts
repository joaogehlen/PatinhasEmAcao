/**
 * Perfis do sistema:
 * - morador: reporta animais, acompanha resgates, vê vaquinhas
 * - admin: gerencia catálogo, status, usuários e vaquinhas
 *
 * O voluntário deixou de existir em 14/09/2026; tudo o que era dele passou
 * para o admin.
 *
 * Convidado NÃO é um perfil: é um morador sem conta confirmada, marcado por
 * `isGuest`. Ele existe no banco com uma sessão anônima real, por isso tem id
 * e a RLS continua funcionando — mas suas permissões são um subconjunto.
 */
export const USER_ROLES = ['morador', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  morador: 'Morador',
  admin: 'Administrador',
};

export interface User {
  id: string;
  name: string;
  /** null no convidado: sessão anônima não tem e-mail. */
  email: string | null;
  phone: string | null;
  role: UserRole;
  /** Sessão anônima. Registra denúncia e acompanha as próprias, nada além. */
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
}
