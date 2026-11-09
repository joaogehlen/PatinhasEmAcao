/**
 * Post curto do mural da ONG: resgate concluído, campanha, mutirão.
 *
 * Vincula no máximo um animal OU uma vaquinha, que aparece como cartão
 * clicável na notícia. Uma só fica fixada no topo por vez (o banco desafixa a
 * anterior).
 */
export interface Noticia {
  id: string;
  title: string;
  body: string;
  coverUri: string | null;
  /** Até MAX_NOTICIA_PHOTOS. */
  photoUris: string[];
  animalId: string | null;
  vaquinhaId: string | null;
  pinned: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NoticiaInput = Pick<Noticia, 'title' | 'body' | 'coverUri' | 'photoUris' | 'animalId' | 'vaquinhaId' | 'pinned'>;

export const MAX_NOTICIA_PHOTOS = 6;
