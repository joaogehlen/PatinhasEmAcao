import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';

import { persistPhoto } from '@/infrastructure/photoStorage';

import { colors, radius, spacing } from '../theme';
import { Icon } from './Icon';
import { AppText, Button, IconButton } from './ui';

interface PhotoPickerProps {
  uri: string | null;
  onChange: (uri: string | null) => void;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.7,
};

export function PhotoPicker({ uri, onChange }: PhotoPickerProps) {
  const [busy, setBusy] = useState(false);
  const canUseCamera = Platform.OS !== 'web';

  async function pick(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso nas configurações do aparelho para adicionar fotos.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled) return;

    setBusy(true);
    try {
      // No web não há sistema de arquivos persistente; usamos a URI direto.
      const pickedUri = result.assets[0]!.uri;
      onChange(Platform.OS === 'web' ? pickedUri : await persistPhoto(pickedUri));
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar a foto.');
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <View style={[styles.frame, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (uri) {
    return (
      <View style={styles.frame}>
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
    <View style={[styles.frame, styles.empty]}>
      <View style={styles.emptyIcon}>
        <Icon name="camera" size={28} color={colors.primary} />
      </View>
      <AppText variant="subheading">Adicione uma foto</AppText>
      <AppText variant="caption" color={colors.textMuted} style={{ textAlign: 'center' }}>
        Uma boa foto ajuda na identificação e aumenta as chances de adoção.
      </AppText>
      <View style={styles.emptyActions}>
        {canUseCamera && <Button title="Câmera" icon="camera" variant="secondary" onPress={() => pick('camera')} style={{ flex: 1 }} />}
        <Button title="Galeria" icon="gallery" variant="outline" onPress={() => pick('library')} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { aspectRatio: 4 / 3, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.primarySoft },
  center: { alignItems: 'center', justifyContent: 'center' },
  overlayActions: { position: 'absolute', right: spacing.md, bottom: spacing.md, flexDirection: 'row', gap: spacing.sm },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#F5B899',
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' },
});
