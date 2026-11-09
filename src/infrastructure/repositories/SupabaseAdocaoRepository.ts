import type { Adocao, AdocaoStatus } from '@/domain/entities/Adocao';
import type { AdocaoFilters, AdocaoRepository } from '@/domain/repositories/AdocaoRepository';

import { supabase } from '../supabase/client';
import { fromAdocao, toAdocao, translateError } from '../supabase/mappers';

/**
 * Pedidos de adoção. Lê pela view adocoes_detalhe, que traz nome e contato de
 * quem pediu; escreve na tabela adocoes. A RLS mostra ao morador só os dele.
 */
export class SupabaseAdocaoRepository implements AdocaoRepository {
  async list(filters: AdocaoFilters = {}): Promise<Adocao[]> {
    let query = supabase.from('adocoes_detalhe').select('*').order('created_at', { ascending: true });
    if (filters.requesterId) query = query.eq('requester_id', filters.requesterId);
    if (filters.animalId) query = query.eq('animal_id', filters.animalId);
    if (filters.statuses) query = query.in('status', [...filters.statuses]);

    const { data, error } = await query;
    if (error) translateError(error);
    return (data ?? []).map(toAdocao);
  }

  async findById(id: string): Promise<Adocao | null> {
    const { data, error } = await supabase.from('adocoes_detalhe').select('*').eq('id', id).maybeSingle();
    if (error) translateError(error);
    return data ? toAdocao(data) : null;
  }

  async create(adocao: Adocao): Promise<void> {
    const { error } = await supabase.from('adocoes').insert(fromAdocao(adocao));
    if (error) translateError(error);
  }

  async updateStatus(id: string, status: AdocaoStatus, reviewNote: string | null): Promise<void> {
    const { error } = await supabase.from('adocoes').update({ status, review_note: reviewNote }).eq('id', id);
    if (error) translateError(error);
  }
}
