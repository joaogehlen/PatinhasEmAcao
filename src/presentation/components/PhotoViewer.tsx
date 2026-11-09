import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';
import { AppText, IconButton } from './ui';

/** Foto em tela cheia, deslizando entre as da galeria. */
export function PhotoViewer({ uris, index, onClose }: { uris: string[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Mantém a última foto montada durante o fade de saída, em vez de piscar preto.
  const [shown, setShown] = useState(index ?? 0);
  const [current, setCurrent] = useState(index ?? 0);
  if (index !== null && index !== shown) {
    setShown(index);
    setCurrent(index);
  }

  return (
    <Modal visible={index !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.viewer}>
        {uris.length > 0 && (
          <FlatList
            key={shown}
            data={uris}
            keyExtractor={(uri) => uri}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(shown, uris.length - 1)}
            onMomentumScrollEnd={(event) => setCurrent(Math.round(event.nativeEvent.contentOffset.x / width))}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} contentFit="contain" style={{ width, height }} />
            )}
          />
        )}
        {uris.length > 1 && (
          <View style={[styles.viewerCounter, { top: insets.top + spacing.md + 12 }]}>
            <AppText variant="label" color={colors.white}>
              {current + 1}/{uris.length}
            </AppText>
          </View>
        )}
        <View style={[styles.viewerClose, { top: insets.top + spacing.md }]}>
          <IconButton icon="close" variant="glass" accessibilityLabel="Fechar foto" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerClose: { position: 'absolute', right: spacing.lg },
  viewerCounter: { position: 'absolute', left: spacing.lg },
});
