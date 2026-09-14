import type { User, UserRole } from '../entities/User';

/**
 * Matriz de permissões por perfil. Centralizada aqui para que telas
 * (esconder botões) e serviços (bloquear operações) usem a mesma fonte.
 */
export type Permission =
  | 'animal:create'
  | 'animal:update'
  | 'animal:delete'
  | 'animal:changeStatus'
  | 'user:list'
  | 'user:manage';

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  morador: ['animal:create'],
  voluntario: ['animal:create', 'animal:update', 'animal:changeStatus'],
  admin: [
    'animal:create',
    'animal:update',
    'animal:delete',
    'animal:changeStatus',
    'user:list',
    'user:manage',
  ],
};

export function hasPermission(user: Pick<User, 'role'> | null, permission: Permission): boolean {
  return user !== null && ROLE_PERMISSIONS[user.role].includes(permission);
}
