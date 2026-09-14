import type { Vaquinha } from '@/domain/entities/Vaquinha';
import type { VaquinhaFilters, VaquinhaRepository } from '@/domain/repositories/VaquinhaRepository';

import { supabase } from '../supabase/client';
import { fromVaquinha, toVaquinha, translateError } from '../supabase/mappers';

/**
 * Campanhas de arrecadação sobre o Postgres do Supabase.
 *
 * A RLS já esconde as encerradas de quem não é admin e esconde tudo do
 * convidado; `activeOnly` aqui é conveniência de consulta, não segurança.
 */
export class SupabaseVaquinhaRepository implements VaquinhaRepository {
  async list(filters: VaquinhaFilters = {}): Promise<Vaquinha[]> {
    let query = supabase.from('vaquinhas').select('*').order('created_at', { ascending: false });

    if (filters.activeOnly) query = query.eq('active', true);
    if (filters.animalId) query = query.eq('animal_id', filters.animalId);

    const { data, error } = await query;
    if (error) translateError(error);
    return (data ?? []).map(toVaquinha);
  }

  async findById(id: string): Promise<Vaquinha | null> {
    const { data, error } = await supabase.from('vaquinhas').select('*').eq('id', id).maybeSingle();
    if (error) translateError(error);
    return data ? toVaquinha(data) : null;
  }

  async create(vaquinha: Vaquinha): Promise<void> {
    const { error } = await supabase.from('vaquinhas').insert(fromVaquinha(vaquinha));
    if (error) translateError(error);
  }

  async update(vaquinha: Vaquinha): Promise<void> {
    const { id, created_by: _createdBy, ...changes } = fromVaquinha(vaquinha);
    const { error } = await supabase.from('vaquinhas').update(changes).eq('id', id);
    if (error) translateError(error);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('vaquinhas').delete().eq('id', id);
    if (error) translateError(error);
  }
}
