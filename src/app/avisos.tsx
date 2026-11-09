import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import type { Aviso, AvisoKind } from '@/domain/entities/Aviso';
import { Icon, type IconName } from '@/presentation/components/Icon';
import { ListSkeleton } from '@/presentation/components/ListSkeleton';
import { AppText, EmptyState, FormError } from '@/presentation/components/ui';
import { formatDateTime } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, radius, rules, spacing } from '@/presentation/theme';

const KIND_ICONS: Record<AvisoKind, IconName> = {
  denuncia_nova: 'megaphone',
  status_animal: 'paw',
  adocao_nova: 'heart',
  adocao_status: 'heart',
};

/**
 * Central de avisos. Tocar num aviso marca como lido e abre o animal ou o
 * pedido de adoção a que ele se refere.
 */
export default function AvisosScreen() {
  const { avisos } = useServices();
  const actor = useCurrentUser();
  const router = useRouter();

  const query = useCallback(() => avisos.list(actor), [avisos, actor]);
  const { data, error, loading, reload } = useFocusedQuery(query);
  const hasUnread = (data ?? []).some((aviso) => aviso.readAt === null);

  async function open(aviso: Aviso) {
    // Marcar como lido não pode impedir de abrir o que o aviso aponta.
    if (aviso.readAt === null) void avisos.markRead(actor, [aviso.id]).catch(() => undefined);
    if (aviso.adocaoId) router.push({ pathname: '/adocoes/[id]', params: { id: aviso.adocaoId } });
    else if (aviso.animalId) router.push({ pathname: '/animals/[id]', params: { id: aviso.animalId } });
    else void reload();
  }

  async function markAll() {
    await avisos.markAllRead(actor).catch(() => undefined);
    await reload();
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: hasUnread
            ? () => (
                <Pressable onPress={markAll} accessibilityRole="button" hitSlop={12}>
                  <AppText variant="label" color={colors.primary}>
                    Marcar todos como lidos
                  </AppText>
                </Pressable>
              )
            : undefined,
        }}
      />
      <FlatList
        style={styles.container}
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<FormError message={error} />}
        refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={reload} tintColor={colors.primary} />}
        renderItem={({ item }) => <AvisoRow aviso={item} onPress={() => void open(item)} />}
        ListEmptyComponent={loading ? <ListSkeleton /> : <EmptyState title="Nenhum aviso por enquanto" />}
      />
    </>
  );
}

function AvisoRow({ aviso, onPress }: { aviso: Aviso; onPress: () => void }) {
  const unread = aviso.readAt === null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Não lido. ' : ''}${aviso.title}. ${aviso.body}`}
      style={({ pressed }) => [styles.row, unread && styles.rowUnread, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.icon, unread && { backgroundColor: colors.primarySoft }]}>
        <Icon name={KIND_ICONS[aviso.kind]} size={18} color={unread ? colors.primary : colors.textMuted} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant={unread ? 'bodyStrong' : 'body'}>{aviso.title}</AppText>
        <AppText variant="body" color={colors.textSoft}>
          {aviso.body}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {formatDateTime(aviso.createdAt)}
        </AppText>
      </View>
      {unread && <View style={styles.dot} accessibilityElementsHidden />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: rules.hair,
    borderColor: colors.border,
  },
  rowUnread: { borderColor: colors.primary },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
});
