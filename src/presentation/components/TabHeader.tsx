import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';
import { AppText } from './ui';

/**
 * Cabeçalho das telas raiz das abas: título grande no alto, com a mesma
 * distância da área segura em todas. As telas empilhadas usam o cabeçalho
 * nativo da Stack; as de foto, o transparente sobre a imagem.
 */
export function TabHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.text}>
        {subtitle ? (
          <AppText variant="body" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  text: { flex: 1, gap: 2 },
});
