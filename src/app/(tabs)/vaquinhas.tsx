import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { vaquinhaProgress, type Vaquinha } from '@/domain/entities/Vaquinha';
import { Icon } from '@/presentation/components/Icon';
import { AppText, EmptyState, FormError } from '@/presentation/components/ui';
import { formatMoney } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useAuth, useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, radius, rules, shadows, spacing } from '@/presentation/theme';

/**
 * Campanhas de arrecadação.
 *
 * A ONG publica meta, chave PIX e quanto já entrou; o doador paga pelo banco
 * dele. Nenhum dinheiro passa pelo app, e a tela não finge o contrário — não
 * há botão "doar", há "copiar chave PIX".
 */
export default function VaquinhasScreen() {
  const { vaquinhas } = useServices();
  const { can } = useAuth();
  const actor = useCurrentUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const query = useCallback(() => vaquinhas.list(actor), [vaquinhas, actor]);
  const { data, error, loading, reload } = useFocusedQuery(query);

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 96 },
        ]}
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
          <View style={styles.header}>
            <AppText variant="title">Vaquinhas</AppText>
            <AppText variant="body" color={colors.textMuted}>
              A doação é feita pelo seu banco, com a chave PIX da ONG.
            </AppText>
            <FormError message={error} />
          </View>
        }
        renderItem={({ item }) => (
          <VaquinhaCard
            vaquinha={item}
            canManage={can('vaquinha:manage')}
            onEdit={() => router.push({ pathname: '/vaquinhas/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title="Nenhuma vaquinha aberta"
              message={
                can('vaquinha:manage')
                  ? 'Crie a primeira campanha para começar a arrecadar.'
                  : 'Quando a ONG abrir uma campanha, ela aparece aqui.'
              }
            />
          )
        }
      />

      {can('vaquinha:manage') && (
        <Pressable
          onPress={() => router.push('/vaquinhas/new')}
          accessibilityRole="button"
          accessibilityLabel="Criar vaquinha"
          style={({ pressed }) => [
            styles.fab,
            { bottom: insets.bottom + spacing.lg },
            pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Icon name="add" size={20} color={colors.onPrimary} />
          <AppText variant="button" color={colors.onPrimary}>
            Nova vaquinha
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

function VaquinhaCard({
  vaquinha,
  canManage,
  onEdit,
}: {
  vaquinha: Vaquinha;
  canManage: boolean;
  onEdit: () => void;
}) {
  const progress = vaquinhaProgress(vaquinha);

  async function copyPix() {
    if (!vaquinha.pixKey) return;
    await Clipboard.setStringAsync(vaquinha.pixKey);
    Alert.alert('Chave copiada', 'Cole no aplicativo do seu banco para fazer a doação.');
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading">{vaquinha.title}</AppText>
          {!vaquinha.active && (
            <AppText variant="caption" color={colors.textMuted}>
              Campanha encerrada
            </AppText>
          )}
        </View>
        {canManage && (
          <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Editar vaquinha" hitSlop={10}>
            <Icon name="edit" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <AppText variant="body" color={colors.textSoft}>
        {vaquinha.description}
      </AppText>

      <View style={styles.progressBlock}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={styles.progressRow}>
          <AppText variant="bodyStrong" color={colors.primary}>
            {formatMoney(vaquinha.raisedCents)}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            de {formatMoney(vaquinha.goalCents)}
          </AppText>
        </View>
      </View>

      {vaquinha.pixKey ? (
        <Pressable
          onPress={copyPix}
          accessibilityRole="button"
          style={({ pressed }) => [styles.pixRow, pressed && { opacity: 0.8 }]}
        >
          <Icon name="copy" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="label" color={colors.textMuted}>
              Chave PIX
            </AppText>
            <AppText variant="record" numberOfLines={1}>
              {vaquinha.pixKey}
            </AppText>
          </View>
        </Pressable>
      ) : (
        <AppText variant="caption" color={colors.textMuted}>
          A ONG ainda não informou a chave PIX desta campanha.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  header: { gap: spacing.xs, marginBottom: spacing.sm },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: rules.hair,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },

  progressBlock: { gap: spacing.sm },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },

  pixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },

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
