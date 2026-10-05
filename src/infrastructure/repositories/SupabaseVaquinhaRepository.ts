import type { Vaquinha, VaquinhaEntrada } from '@/domain/entities/Vaquinha';
import type { VaquinhaFilters, VaquinhaRepository } from '@/domain/repositories/VaquinhaRepository';

import { supabase } from '../supabase/client';
import { fromVaquinha, fromVaquinhaEntrada, toVaquinha, toVaquinhaEntrada, translateError } from '../supabase/mappers';

/**
 * Campanhas de arrecadação sobre o Postgres do Supabase.
 *
 * A RLS já esconde as encerradas de quem não é admin e esconde tudo do
 * convidado; `activeOnly` aqui é conveniência de consulta, não segurança.
 *
 * raised_cents nunca é enviado: o trigger vaquinha_sync_raised o recalcula a
 * partir de vaquinha_entradas em todo insert e update.
 */
export class SupabaseVaquinhaRepository implements VaquinhaRepository {
  async list(filters: VaquinhaFilters = {}): Promise<Vaquinha[]> {
    let query = supabase
      .from('vaquinhas')
      .select('*')
      .order('active', { ascending: false })
      .order('created_at', { ascending: false });

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

  async listEntradas(vaquinhaId: string): Promise<VaquinhaEntrada[]> {
    const { data, error } = await supabase
      .from('vaquinha_entradas')
      .select('*')
      .eq('vaquinha_id', vaquinhaId)
      .order('created_at', { ascending: false });
    if (error) translateError(error);
    return (data ?? []).map(toVaquinhaEntrada);
  }

  async addEntrada(entrada: VaquinhaEntrada): Promise<void> {
    const { error } = await supabase.from('vaquinha_entradas').insert(fromVaquinhaEntrada(entrada));
    if (error) translateError(error);
  }

  async deleteEntrada(id: string): Promise<void> {
    const { error } = await supabase.from('vaquinha_entradas').delete().eq('id', id);
    if (error) translateError(error);
  }
}
