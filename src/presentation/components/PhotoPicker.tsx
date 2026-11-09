import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { keepLocalPhoto, persistPhoto, shrinkPhoto } from '@/infrastructure/photoStorage';

import { describeError } from '../format';
import { colors, radius, rules, spacing } from '../theme';
import { Icon } from './Icon';
import { AppText, Avatar, Button, IconButton } from './ui';

type Source = 'camera' | 'library';

const canUseCamera = Platform.OS !== 'web';

/**
 * Pede permissão, abre câmera ou galeria e sobe as fotos escolhidas para o
 * Storage. Devolve as URLs públicas — vazio se o usuário cancelou ou negou.
 *
 * Uma foto que falha no upload não descarta as outras: o usuário vê o erro e
 * fica com o que subiu.
 */
async function pickAndUpload(
  source: Source,
  options: { multiple?: number; aspect?: [number, number]; folder?: string; defer?: boolean; maxSide?: number },
): Promise<string[]> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permissão necessária', 'Autorize o acesso às fotos.');
    return [];
  }

  // Galeria (options.multiple definido) não recorta: a foto vale inteira.
  // Recorte e seleção múltipla são mutuamente exclusivos no picker.
  const gallery = options.multiple !== undefined;
  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
    ...(gallery
      ? source === 'library' && options.multiple! > 1
        ? { allowsMultipleSelection: true, selectionLimit: options.multiple, orderedSelection: true }
        : {}
      : { allowsEditing: true, aspect: options.aspect ?? [4, 3] }),
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);
  if (result.canceled) return [];

  // selectionLimit não vale no web: corta antes de subir, sem deixar órfãos no Storage.
  const assets = result.assets.slice(0, options.multiple ?? 1);
  const uploaded: string[] = [];
  for (const asset of assets) {
    try {
      // A foto sobe para o Storage e o que fica no banco é a URL pública: o
      // registro é lido por outras pessoas, em outros aparelhos.
      // No web a URI é blob: e morre com a aba; lá a foto sobe na hora.
      const photo = await shrinkPhoto(asset.uri, asset, options.maxSide);
      uploaded.push(
        options.defer && Platform.OS !== 'web' ? await keepLocalPhoto(photo) : await persistPhoto(photo, options.folder),
      );
    } catch (error) {
      // A mensagem real distingue "sem internet" de "arquivo não encontrado".
      Alert.alert('Não foi possível enviar a foto', describeError(error).message);
      break;
    }
  }
  return uploaded;
}

/** Escolha entre câmera e galeria: action sheet no iOS, alerta no resto. */
function askSource(title: string, pick: (source: Source) => void, remove?: () => void) {
  if (!canUseCamera && !remove) return pick('library');
  const labels = [...(canUseCamera ? ['Câmera'] : []), 'Galeria', ...(remove ? ['Remover foto'] : [])];
  const run = (label: string) => {
    if (label === 'Câmera') pick('camera');
    if (label === 'Galeria') pick('library');
    if (label === 'Remover foto') remove?.();
  };
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...labels, 'Cancelar'],
        cancelButtonIndex: labels.length,
        destructiveButtonIndex: remove ? labels.length - 1 : undefined,
        title,
      },
      (index) => {
        const label = labels[index];
        if (label) run(label);
      },
    );
    return;
  }
  Alert.alert(title, undefined, [
    ...labels.map((label) => ({ text: label, onPress: () => run(label) })),
    { text: 'Cancelar', style: 'cancel' as const },
  ]);
}

interface PhotoPickerProps {
  uri: string | null;
  onChange: (uri: string | null) => void;
  /** Proporção do recorte e do quadro. Padrão 4:3. */
  aspect?: [number, number];
  /** Pasta no bucket. */
  folder?: string;
  title?: string;
  hint?: string;
  /** Guarda a foto no aparelho em vez de subir agora; quem salva envia depois. */
  deferUpload?: boolean;
}

export function PhotoPicker({
  uri,
  onChange,
  aspect = [4, 3],
  folder,
  title = 'Adicione uma foto',
  hint,
  deferUpload = false,
}: PhotoPickerProps) {
  const [busy, setBusy] = useState(false);
  const frame = [styles.frame, { aspectRatio: aspect[0] / aspect[1] }];

  async function pick(source: Source) {
    setBusy(true);
    try {
      const [url] = await pickAndUpload(source, { aspect, folder, defer: deferUpload });
      if (url) onChange(url);
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <View style={[frame, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (uri) {
    return (
      <View style={frame}>
        <Image source={{ uri }} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
        <View style={styles.overlayActions}>
          {canUseCamera && <IconButton icon="camera" variant="glass" accessibilityLabel="Tirar outra foto" onPress={() => pick('camera')} />}
          <IconButton icon="gallery" variant="glass" accessibilityLabel="Escolher outra foto" onPress={() => pick('library')} />
          <IconButton icon="trash" variant="glass" accessibilityLabel="Remover foto" onPress={() => onChange(null)} />
        </View>
      </View>
    );
  }

  return (
    <View style={[frame, styles.empty]}>
      <View style={styles.emptyIcon}>
        <Icon name="camera" size={28} color={colors.primary} />
      </View>
      <AppText variant="subheading">{title}</AppText>
      {hint ? (
        <AppText variant="caption" color={colors.textMuted} style={{ textAlign: 'center' }}>
          {hint}
        </AppText>
      ) : null}
      <View style={styles.emptyActions}>
        {canUseCamera && <Button title="Câmera" icon="camera" variant="secondary" onPress={() => pick('camera')} style={{ flex: 1 }} />}
        <Button title="Galeria" icon="gallery" variant="outline" onPress={() => pick('library')} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

interface PhotoGalleryPickerProps {
  uris: string[];
  onChange: (uris: string[]) => void;
  max: number;
  folder?: string;
  error?: string;
}

/** Grade de fotos com remoção individual e adição em lote pela galeria. */
export function PhotoGalleryPicker({ uris, onChange, max, folder, error }: PhotoGalleryPickerProps) {
  const [busy, setBusy] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);
  const remaining = max - uris.length;
  // A lista pode mudar durante o upload; lê a versão atual ao terminar.
  const latest = useRef(uris);
  latest.current = uris;

  async function add(source: Source) {
    setBusy(true);
    try {
      const added = await pickAndUpload(source, { multiple: remaining, folder });
      if (added.length > 0) onChange([...latest.current, ...added].slice(0, max));
    } finally {
      setBusy(false);
    }
  }

  // Três por linha, calculado em pixels: porcentagem + gap estoura em telas estreitas.
  const tileSize = gridWidth > 0 ? (gridWidth - 2 * spacing.sm) / 3 : 0;
  const tile = { width: tileSize, height: tileSize };

  function chooseSource() {
    askSource('Adicionar fotos', (source) => void add(source));
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.grid} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
        {tileSize > 0 && uris.map((uri, index) => (
          <View key={uri} style={[styles.thumb, tile]}>
            <Image source={{ uri }} contentFit="cover" transition={150} style={StyleSheet.absoluteFill} />
            <View style={styles.thumbRemove}>
              <IconButton
                icon="close"
                variant="glass"
                size={30}
                accessibilityLabel={`Remover foto ${index + 1}`}
                onPress={() => !busy && onChange(uris.filter((item) => item !== uri))}
              />
            </View>
          </View>
        ))}
        {tileSize > 0 && remaining > 0 && (
          <Pressable
            onPress={chooseSource}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Adicionar fotos"
            style={({ pressed }) => [styles.thumb, tile, styles.addTile, pressed && { opacity: 0.8 }]}
          >
            {busy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Icon name="add" size={24} color={colors.primary} />
                <AppText variant="caption" color={colors.textMuted}>
                  Adicionar
                </AppText>
              </>
            )}
          </Pressable>
        )}
      </View>
      <AppText variant="caption" color={error ? colors.danger : colors.textMuted}>
        {error ?? `${uris.length} de ${max} fotos`}
      </AppText>
    </View>
  );
}

interface AvatarPickerProps {
  uri: string | null;
  name?: string;
  onChange: (uri: string | null) => void;
}

/** Foto de perfil redonda; tocar troca ou remove. */
export function AvatarPicker({ uri, name, onChange }: AvatarPickerProps) {
  const [busy, setBusy] = useState(false);

  async function pick(source: Source) {
    setBusy(true);
    try {
      // Foto de perfil aparece no máximo em 96pt: 512px sobram.
      const [url] = await pickAndUpload(source, { aspect: [1, 1], folder: 'avatars', maxSide: 512 });
      if (url) onChange(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      onPress={() => askSource('Foto de perfil', (source) => void pick(source), uri ? () => onChange(null) : undefined)}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={uri ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
      style={styles.avatarWrap}
    >
      <Avatar name={name} uri={uri} size={96} />
      {busy && (
        <View style={[StyleSheet.absoluteFill, styles.avatarBusy]}>
          <ActivityIndicator color={colors.white} />
        </View>
      )}
      <View style={styles.avatarBadge}>
        <Icon name="camera" size={16} color={colors.onPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignSelf: 'center', width: 96, height: 96 },
  avatarBusy: { borderRadius: 48, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  center: { alignItems: 'center', justifyContent: 'center' },
  overlayActions: { position: 'absolute', right: spacing.md, bottom: spacing.md, flexDirection: 'row', gap: spacing.sm },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  thumbRemove: { position: 'absolute', top: 4, right: 4 },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: rules.base,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
});
