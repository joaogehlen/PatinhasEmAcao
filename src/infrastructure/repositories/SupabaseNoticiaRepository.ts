import type { Noticia } from '@/domain/entities/Noticia';
import type { NoticiaRepository } from '@/domain/repositories/NoticiaRepository';

import { supabase } from '../supabase/client';
import { fromNoticia, toNoticia, translateError } from '../supabase/mappers';

/** Mural sobre public.noticias. A RLS esconde tudo do convidado (0008). */
export class SupabaseNoticiaRepository implements NoticiaRepository {
  async list(): Promise<Noticia[]> {
    const { data, error } = await supabase
      .from('noticias')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) translateError(error);
    return (data ?? []).map(toNoticia);
  }

  async findById(id: string): Promise<Noticia | null> {
    const { data, error } = await supabase.from('noticias').select('*').eq('id', id).maybeSingle();
    if (error) translateError(error);
    return data ? toNoticia(data) : null;
  }

  async create(noticia: Noticia): Promise<void> {
    const { error } = await supabase.from('noticias').insert(fromNoticia(noticia));
    if (error) translateError(error);
  }

  async update(noticia: Noticia): Promise<void> {
    const { id, created_by: _createdBy, ...changes } = fromNoticia(noticia);
    const { error } = await supabase.from('noticias').update(changes).eq('id', id);
    if (error) translateError(error);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('noticias').delete().eq('id', id);
    if (error) translateError(error);
  }
}
