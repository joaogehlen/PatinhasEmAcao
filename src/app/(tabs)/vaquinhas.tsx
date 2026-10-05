import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { vaquinhaProgress, type Vaquinha } from '@/domain/entities/Vaquinha';
import { Icon } from '@/presentation/components/Icon';
import { AppText, EmptyState, FormError, Pill } from '@/presentation/components/ui';
import { formatMoney } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useAuth, useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, radius, rules, shadows, spacing } from '@/presentation/theme';

/**
 * Campanhas de arrecadação.
 *
 * A ONG publica meta, chave PIX e quanto já entrou; o doador paga pelo banco
 * dele. Nenhum dinheiro passa pelo app, e a tela não finge o contrário — não
 * há botão "doar", há "copiar chave PIX", na página de cada campanha.
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
              Toque numa campanha para ver os detalhes e copiar a chave PIX. A doação é feita pelo seu banco.
            </AppText>
            <FormError message={error} />
          </View>
        }
        renderItem={({ item }) => (
          <VaquinhaCard
            vaquinha={item}
            onPress={() => router.push({ pathname: '/vaquinhas/[id]', params: { id: item.id } })}
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

function VaquinhaCard({ vaquinha, onPress }: { vaquinha: Vaquinha; onPress: () => void }) {
  const progress = vaquinhaProgress(vaquinha);
  const percent = Math.floor(progress * 100);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${vaquinha.title}, ${percent}% da meta`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.cover}>
        {vaquinha.coverUri ? (
          <Image source={{ uri: vaquinha.coverUri }} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
        ) : (
          <Icon name="donate" size={36} color={colors.textMuted} />
        )}
        {!vaquinha.active && (
          <View style={styles.coverPill}>
            <Pill icon="clock" label="Encerrada" background="rgba(14, 9, 7, 0.82)" color={colors.text} />
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <AppText variant="heading" numberOfLines={2}>
          {vaquinha.title}
        </AppText>
        <AppText variant="body" color={colors.textSoft} numberOfLines={2}>
          {vaquinha.description}
        </AppText>

        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, !vaquinha.active && styles.progressFillClosed, { width: `${progress * 100}%` }]}
            />
          </View>
          <View style={styles.progressRow}>
            <AppText variant="bodyStrong" color={colors.primary}>
              {formatMoney(vaquinha.raisedCents)}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
              de {formatMoney(vaquinha.goalCents)}
            </AppText>
            <AppText variant="label" color={colors.textSoft}>
              {percent}%
            </AppText>
          </View>
        </View>
      </View>
    </Pressable>
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
    overflow: 'hidden',
  },
  cover: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPill: { position: 'absolute', top: spacing.md, left: spacing.md },
  cardBody: { padding: spacing.lg, gap: spacing.sm },

  progressBlock: { gap: spacing.sm, marginTop: spacing.xs },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  // Encerrada: a barra para de chamar para a ação, mas o número continua legível.
  progressFillClosed: { backgroundColor: colors.secondaryDark },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },

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
