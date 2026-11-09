import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Noticia } from '@/domain/entities/Noticia';
import { Icon } from '@/presentation/components/Icon';
import { ListSkeleton } from '@/presentation/components/ListSkeleton';
import { TabHeader } from '@/presentation/components/TabHeader';
import { AppText, EmptyState, FormError, Pill } from '@/presentation/components/ui';
import { formatDate } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useAuth, useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, layout, radius, rules, shadows, spacing } from '@/presentation/theme';

/**
 * Mural da ONG: resgates concluídos, campanhas, mutirões.
 *
 * A notícia fixada vem primeiro. Quem tem conta lê; o convidado não chega
 * aqui (a aba some para ele).
 */
export default function MuralScreen() {
  const { noticias } = useServices();
  const { can } = useAuth();
  const actor = useCurrentUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const query = useCallback(() => noticias.list(actor), [noticias, actor]);
  const { data, error, loading, reload } = useFocusedQuery(query);

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && data !== null}
            onRefresh={reload}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={
          <View>
            <TabHeader title="Mural" />
            <FormError message={error} />
          </View>
        }
        renderItem={({ item }) => (
          <NoticiaCard noticia={item} onPress={() => router.push({ pathname: '/noticias/[id]', params: { id: item.id } })} />
        )}
        ListEmptyComponent={loading ? <ListSkeleton variant="card" count={2} /> : <EmptyState title="Nenhuma notícia ainda" />}
      />

      {can('noticia:manage') && (
        <Pressable
          onPress={() => router.push('/noticias/new')}
          accessibilityRole="button"
          accessibilityLabel="Publicar notícia"
          style={({ pressed }) => [
            styles.fab,
            { bottom: insets.bottom + spacing.lg },
            pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Icon name="add" size={20} color={colors.onPrimary} />
          <AppText variant="button" color={colors.onPrimary}>
            Nova notícia
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

function NoticiaCard({ noticia, onPress }: { noticia: Noticia; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${noticia.pinned ? 'Fixada. ' : ''}${noticia.title}`}
      style={({ pressed }) => [styles.card, noticia.pinned && styles.cardPinned, pressed && { opacity: 0.9 }]}
    >
      {noticia.coverUri && (
        <View style={styles.cover}>
          <Image source={{ uri: noticia.coverUri }} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          {noticia.pinned && <Pill icon="pin" label="Fixada" background={colors.primarySoft} color={colors.primary} />}
          <AppText variant="caption" color={colors.textMuted}>
            {formatDate(noticia.createdAt)}
          </AppText>
        </View>
        <AppText variant="heading" numberOfLines={2}>
          {noticia.title}
        </AppText>
        <AppText variant="body" color={colors.textSoft} numberOfLines={3}>
          {noticia.body}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.xl, gap: spacing.lg, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: rules.hair,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardPinned: { borderColor: colors.primary, borderWidth: rules.base },
  cover: { aspectRatio: 16 / 9, backgroundColor: colors.surfaceAlt },
  cardBody: { padding: spacing.lg, gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
});
