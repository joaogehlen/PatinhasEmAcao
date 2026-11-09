import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useFocusedQuery } from '../hooks/useFocusedQuery';
import { useCurrentUser, useServices } from '../providers/AppProviders';
import { colors, rules, shadows } from '../theme';
import { Icon } from './Icon';
import { AppText } from './ui';

/**
 * Sino com o contador de avisos não lidos. Recarrega quando a tela volta ao
 * foco, então o número já desce ao voltar da central de avisos.
 */
export function AvisoBell() {
  const { avisos } = useServices();
  const user = useCurrentUser();
  const router = useRouter();
  const query = useCallback(() => avisos.countUnread(user).catch(() => 0), [avisos, user]);
  const { data: unread } = useFocusedQuery(query);
  const count = unread ?? 0;

  return (
    <Pressable
      onPress={() => router.push('/avisos')}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Avisos, ${count} não lidos` : 'Avisos'}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
    >
      <Icon name="bell" size={22} color={colors.text} />
      {count > 0 && (
        <View style={styles.badge}>
          <AppText variant="label" color={colors.onPrimary} style={styles.badgeText}>
            {count > 99 ? '99+' : count}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: rules.hair,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 14 },
});
