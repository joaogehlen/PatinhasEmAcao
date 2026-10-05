import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { DomainError, OfflineError } from '@/domain/errors';

import { ANIMAL_PHOTOS_BUCKET, supabase } from './supabase/client';
import { isOffline } from './supabase/mappers';

/**
 * Envia a foto para o Storage do Supabase e devolve a URL pública.
 *
 * Na Sprint 1 isto copiava o arquivo do cache para o diretório de documentos,
 * porque a URI ficava no banco local do próprio aparelho. Agora o registro é
 * compartilhado: uma URI `file://` não significaria nada no celular do
 * voluntário que vai atender a denúncia.
 *
 * O bucket é público para leitura — a foto de um animal para adoção é conteúdo
 * de divulgação, e URL assinada obrigaria a renovar link a cada exibição.
 */
export async function persistPhoto(sourceUri: string, folder?: string): Promise<string> {
  const { data, contentType, extension } = await readSource(sourceUri);
  // As fotos das vaquinhas dividem o bucket com as dos animais, em pasta própria.
  const path = `${folder ? `${folder}/` : ''}${randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(ANIMAL_PHOTOS_BUCKET).upload(path, data, {
    contentType,
    upsert: false,
  });

  if (error) {
    if (isOffline(error.message)) {
      throw new OfflineError('Sem conexão para enviar a foto. Verifique a internet e tente de novo.');
    }
    throw new DomainError(`Não foi possível enviar a foto: ${error.message}`);
  }

  return supabase.storage.from(ANIMAL_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Copia a foto para os documentos do app, para ser enviada depois.
 *
 * É o caminho da denúncia offline: o picker entrega um arquivo no cache, que o
 * sistema pode apagar antes de a internet voltar.
 */
export async function keepLocalPhoto(sourceUri: string): Promise<string> {
  const dir = new Directory(Paths.document, 'pending-photos');
  dir.create({ idempotent: true, intermediates: true });
  const source = new File(sourceUri);
  const target = new File(dir, `${randomUUID()}${source.extension || '.jpg'}`);
  await source.copy(target);
  return target.uri;
}

export function isLocalPhoto(uri: string): boolean {
  return uri.startsWith('file://');
}

export function deleteLocalPhoto(uri: string): void {
  try {
    new File(uri).delete();
  } catch {
    // Já apagada: nada a fazer.
  }
}

interface PhotoSource {
  data: Uint8Array | Blob;
  contentType: string;
  extension: string;
}

/**
 * No nativo o picker devolve `file://` e lemos pelo expo-file-system. No web a
 * URI é `blob:` — que o File do expo-file-system não abre — e o próprio fetch
 * resolve. Antes o web guardava a URI local direto; num banco compartilhado
 * isso gravaria um endereço que só existe naquela aba do navegador.
 */
async function readSource(sourceUri: string): Promise<PhotoSource> {
  if (Platform.OS === 'web') {
    const blob = await fetch(sourceUri).then((response) => response.blob());
    const contentType = blob.type || 'image/jpeg';
    return { data: blob, contentType, extension: extensionFromMime(contentType) };
  }

  const file = new File(sourceUri);
  if (!file.exists) throw new DomainError('A foto selecionada não foi encontrada no aparelho.');

  const extension = (file.extension || '.jpg').replace(/^\./, '').toLowerCase();
  return {
    data: await file.bytes(),
    contentType: file.type ?? mimeFromExtension(extension),
    extension,
  };
}

function extensionFromMime(mime: string): string {
  const subtype = mime.split('/')[1]?.split(';')[0]?.toLowerCase();
  if (!subtype) return 'jpg';
  return subtype === 'jpeg' ? 'jpg' : subtype;
}

function mimeFromExtension(extension: string): string {
  return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
}
