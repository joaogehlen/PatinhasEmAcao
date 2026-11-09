import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, radius, spacing } from '../theme';

/**
 * Esboço da lista enquanto carrega: a forma do conteúdo, pulsando devagar.
 * Evita a tela vazia que parece "não tem nada" no primeiro carregamento.
 */
export function ListSkeleton({ variant = 'row', count = 4 }: { variant?: 'row' | 'card'; count?: number }) {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, pulse]);

  return (
    <Animated.View
      style={{ gap: spacing.md, opacity: pulse }}
      accessibilityLabel="Carregando"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: count }, (_, i) =>
        variant === 'card' ? (
          <View key={i} style={styles.card}>
            <View style={styles.media} />
            <View style={styles.body}>
              <View style={[styles.bar, { width: '70%', height: 16 }]} />
              <View style={[styles.bar, { width: '45%' }]} />
            </View>
          </View>
        ) : (
          <View key={i} style={styles.row}>
            <View style={styles.dot} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <View style={[styles.bar, { width: '60%', height: 14 }]} />
              <View style={[styles.bar, { width: '35%' }]} />
            </View>
          </View>
        ),
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  media: { aspectRatio: 16 / 9, backgroundColor: colors.surfaceAlt },
  body: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  dot: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt },
  bar: { height: 12, borderRadius: 6, backgroundColor: colors.surfaceAlt },
});
