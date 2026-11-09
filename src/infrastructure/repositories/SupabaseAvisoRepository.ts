import type { Aviso } from '@/domain/entities/Aviso';
import type { AvisoRepository } from '@/domain/repositories/AvisoRepository';

import { supabase } from '../supabase/client';
import { toAviso, translateError } from '../supabase/mappers';

/** Avisos sobre public.avisos. Quem cria são os triggers da migração 0010. */
export class SupabaseAvisoRepository implements AvisoRepository {
  async list(userId: string): Promise<Aviso[]> {
    const { data, error } = await supabase
      .from('avisos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      // ponytail: últimos 100, paginar se a ONG acumular mais que isso.
      .limit(100);
    if (error) translateError(error);
    return (data ?? []).map(toAviso);
  }

  async countUnread(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('avisos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) translateError(error);
    return count ?? 0;
  }

  async markRead(ids: readonly string[], at: string): Promise<void> {
    const { error } = await supabase.from('avisos').update({ read_at: at }).in('id', [...ids]).is('read_at', null);
    if (error) translateError(error);
  }

  async markAllRead(userId: string, at: string): Promise<void> {
    const { error } = await supabase.from('avisos').update({ read_at: at }).eq('user_id', userId).is('read_at', null);
    if (error) translateError(error);
  }
}
