import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * A câmera/galeria devolve arquivos em cache, que o sistema pode apagar.
 * Copiamos a foto para o diretório de documentos do app para que a URI
 * salva no banco continue válida. (Com backend, aqui entraria o upload.)
 */
export async function persistPhoto(sourceUri: string): Promise<string> {
  const directory = new Directory(Paths.document, 'animal-photos');
  directory.create({ intermediates: true, idempotent: true });

  const extension = sourceUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const destination = new File(directory, `${randomUUID()}.${extension}`);
  await new File(sourceUri).copy(destination);
  return destination.uri;
}
