import type { User, UserRole } from '@/domain/entities/User';
import type { UserFilters, UserRepository } from '@/domain/repositories/UserRepository';

import { supabase } from '../supabase/client';
import { toUser, translateError } from '../supabase/mappers';

/**
 * Perfis sobre a tabela public.profiles.
 *
 * Criar e excluir conta não estão aqui — são do AuthProvider, porque mexem na
 * conta de acesso (auth.users) e não apenas na linha de perfil.
 *
 * A RLS de profiles só deixa um não-admin enxergar a própria linha. `list` e
 * `countByRole` portanto só devolvem dados de verdade para administradores,
 * que é exatamente quem o UserService deixa chamá-los.
 */
export class SupabaseUserRepository implements UserRepository {
  async list(filters: UserFilters = {}): Promise<User[]> {
    let query = supabase.from('profiles').select('*').order('name', { ascending: true });

    const search = filters.search?.trim();
    if (search) {
      const term = search.replace(/[,()\\]/g, ' ').trim();
      query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
    }
    if (filters.role) query = query.eq('role', filters.role);

    const { data, error } = await query;
    if (error) translateError(error);
    // Arrow explícita: `.map(toUser)` passaria o índice como segundo argumento.
    return (data ?? []).map((row) => toUser(row));
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) translateError(error);
    return data ? toUser(data) : null;
  }

  /** Só name, phone e role: o e-mail é espelho de auth.users (guard_profile_update recusa). */
  async update(user: User): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ name: user.name, phone: user.phone, role: user.role })
      .eq('id', user.id);
    if (error) translateError(error);
  }

  /**
   * Passa por RPC, não por update direto.
   *
   * Escrever `deleted_at` pela tabela torna a linha invisível para a própria
   * policy de SELECT, e o RETURNING do PostgREST aborta com permissão negada
   * (ver migração 0005). Além disso, exclusão é operação privilegiada: a
   * regra mora na função, em um lugar só.
   *
   * `at` é ignorado — quem carimba a hora é o servidor, que é o relógio certo.
   */
  async softDelete(id: string, _at: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_user', { target_id: id });
    if (error) translateError(error);
  }

  async countByRole(role: UserRole): Promise<number> {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', role);
    if (error) translateError(error);
    return count ?? 0;
  }
}
