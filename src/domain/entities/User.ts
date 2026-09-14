/**
 * Perfis definidos na proposta:
 * - morador: reporta animais e se candidata à adoção
 * - voluntario: atualiza status de resgate e tratamento
 * - admin: gerencia catálogo de adoção, usuários e doações
 */
export const USER_ROLES = ['morador', 'voluntario', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  morador: 'Morador',
  voluntario: 'Voluntário',
  admin: 'Administrador',
};

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/** Usuário com dados de credencial — nunca sai da camada de infraestrutura/serviço. */
export interface UserWithCredentials extends User {
  passwordHash: string;
  passwordSalt: string;
}
