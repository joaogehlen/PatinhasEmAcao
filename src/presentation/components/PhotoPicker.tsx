import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { keepLocalPhoto, persistPhoto } from '@/infrastructure/photoStorage';

import { describeError } from '../format';
import { colors, radius, rules, spacing } from '../theme';
import { Icon } from './Icon';
import { AppText, Button, IconButton } from './ui';

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
  options: { multiple?: number; aspect?: [number, number]; folder?: string; defer?: boolean },
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
      uploaded.push(
        options.defer && Platform.OS !== 'web'
          ? await keepLocalPhoto(asset.uri)
          : await persistPhoto(asset.uri, options.folder),
      );
    } catch (error) {
      // A mensagem real distingue "sem internet" de "arquivo não encontrado".
      Alert.alert('Não foi possível enviar a foto', describeError(error).message);
      break;
    }
  }
  return uploaded;
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
    if (!canUseCamera) return void add('library');
    // Escolha de origem no iOS é action sheet, não alerta.
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Câmera', 'Galeria', 'Cancelar'], cancelButtonIndex: 2, title: 'Adicionar fotos' },
        (index) => {
          if (index === 0) void add('camera');
          if (index === 1) void add('library');
        },
      );
      return;
    }
    Alert.alert('Adicionar fotos', undefined, [
      { text: 'Câmera', onPress: () => void add('camera') },
      { text: 'Galeria', onPress: () => void add('library') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
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

const styles = StyleSheet.create({
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
