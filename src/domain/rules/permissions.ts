import type { User, UserRole } from '../entities/User';

/**
 * Matriz de permissões. Centralizada aqui para que telas (esconder botão) e
 * serviços (bloquear operação) usem a mesma fonte.
 *
 * ESTA MATRIZ TEM UM ESPELHO NO SERVIDOR: as policies de RLS em
 * supabase/migrations/. Mudou aqui, mude lá — divergência entre as duas é bug
 * silencioso, e é a de lá que de fato protege os dados.
 */
export type Permission =
  | 'animal:create'
  | 'animal:update'
  | 'animal:delete'
  | 'animal:changeStatus'
  | 'animal:viewAll'
  | 'user:list'
  | 'user:manage'
  | 'vaquinha:view'
  | 'vaquinha:manage';

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  morador: ['animal:create', 'animal:viewAll', 'vaquinha:view'],
  admin: [
    'animal:create',
    'animal:update',
    'animal:delete',
    'animal:changeStatus',
    'animal:viewAll',
    'user:list',
    'user:manage',
    'vaquinha:view',
    'vaquinha:manage',
  ],
};

/**
 * O convidado veio fazer uma coisa: avisar que tem um animal precisando de
 * ajuda. Ele registra a denúncia e acompanha as próprias — o resto do app
 * exige conta, e essa é a razão concreta para criar uma.
 */
const GUEST_PERMISSIONS: readonly Permission[] = ['animal:create'];

export function hasPermission(user: Pick<User, 'role' | 'isGuest'> | null, permission: Permission): boolean {
  if (user === null) return false;
  if (user.isGuest) return GUEST_PERMISSIONS.includes(permission);
  return ROLE_PERMISSIONS[user.role].includes(permission);
}
