import type { Noticia } from '../entities/Noticia';

export interface NoticiaRepository {
  /** Fixada primeiro, depois as mais recentes. */
  list(): Promise<Noticia[]>;
  findById(id: string): Promise<Noticia | null>;
  create(noticia: Noticia): Promise<void>;
  /** Fixar desafixa a anterior (trigger noticias_unpin_others). */
  update(noticia: Noticia): Promise<void>;
  delete(id: string): Promise<void>;
}
