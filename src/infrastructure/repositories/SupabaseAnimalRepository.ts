import type { Animal, AnimalStatusChange } from '@/domain/entities/Animal';
import type { AnimalFilters, AnimalRepository } from '@/domain/repositories/AnimalRepository';

import { supabase } from '../supabase/client';
import { fromAnimal, toAnimal, toStatusChange, translateError } from '../supabase/mappers';

/**
 * Implementação do catálogo sobre o Postgres do Supabase.
 *
 * As permissões não são checadas aqui: quem recusa a operação é a RLS, e o
 * AnimalService continua checando antes para esconder botão e dar mensagem boa.
 */
export class SupabaseAnimalRepository implements AnimalRepository {
  async list(filters: AnimalFilters = {}): Promise<Animal[]> {
    let query = supabase.from('animals').select('*').order('created_at', { ascending: false });

    const search = filters.search?.trim();
    if (search) {
      const term = escapeForOr(search);
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
    }
    if (filters.species) query = query.eq('species', filters.species);
    if (filters.size) query = query.eq('size', filters.size);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.temperament) query = query.eq('temperament', filters.temperament);

    const { data, error } = await query;
    if (error) translateError(error);
    return (data ?? []).map(toAnimal);
  }

  async findById(id: string): Promise<Animal | null> {
    const { data, error } = await supabase.from('animals').select('*').eq('id', id).maybeSingle();
    if (error) translateError(error);
    return data ? toAnimal(data) : null;
  }

  /**
   * Insere apenas o animal. A primeira entrada da timeline é criada pelo
   * trigger animals_create_initial_status, e por isso `initialStatus` não é
   * gravado aqui: do cliente seriam dois requests independentes, e um animal
   * sem timeline se o segundo falhasse. O parâmetro continua na interface
   * porque a implementação SQLite (e os testes em memória) precisam dele.
   */
  async create(animal: Animal, _initialStatus: AnimalStatusChange): Promise<void> {
    const { error } = await supabase.from('animals').insert(fromAnimal(animal));
    if (error) translateError(error);
  }

  async update(animal: Animal): Promise<void> {
    const { id, created_by: _createdBy, ...changes } = fromAnimal(animal);
    const { error } = await supabase.from('animals').update(changes).eq('id', id);
    if (error) translateError(error);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('animals').delete().eq('id', id);
    if (error) translateError(error);
  }

  async statusHistory(animalId: string): Promise<AnimalStatusChange[]> {
    const { data, error } = await supabase
      .from('animal_status_history')
      .select('*')
      .eq('animal_id', animalId)
      .order('changed_at', { ascending: true });
    if (error) translateError(error);
    return (data ?? []).map(toStatusChange);
  }
}

/**
 * O filtro `or` do PostgREST é uma string, e vírgula e parênteses são a sua
 * sintaxe. Um usuário buscando por "Mel, a cachorra" quebraria a consulta —
 * removemos esses caracteres em vez de recusar a busca.
 */
function escapeForOr(term: string): string {
  return term.replace(/[,()\\]/g, ' ').trim();
}
