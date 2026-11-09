import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ADOCAO_STATUS_LABELS, ADOCAO_STATUSES, type AdocaoStatus } from '@/domain/entities/Adocao';
import { AdocaoCard } from '@/presentation/components/AdocaoCard';
import { AppText, ChipSelect, EmptyState, FormError } from '@/presentation/components/ui';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, spacing } from '@/presentation/theme';

/**
 * Fila de pedidos de adoção do admin, por ordem de chegada. Abre nos que
 * esperam decisão; os chips mostram os já decididos.
 */
export default function AdocaoQueueScreen() {
  const { adocoes } = useServices();
  const actor = useCurrentUser();
  const router = useRouter();
  const [status, setStatus] = useState<AdocaoStatus | null>(null);

  const query = useCallback(
    () => adocoes.queue(actor, status ? [status] : undefined),
    [adocoes, actor, status],
  );
  const { data, error, loading, reload } = useFocusedQuery(query);

  return (
    <FlatList
      style={styles.container}
      data={data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          <ChipSelect options={ADOCAO_STATUSES} labels={ADOCAO_STATUS_LABELS} value={status} onChange={setStatus} allLabel="Abertos" scroll />
          <FormError message={error} />
          {data && (
            <AppText variant="label" color={colors.textMuted}>
              {data.length} {data.length === 1 ? 'pedido' : 'pedidos'}
            </AppText>
          )}
        </View>
      }
      refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={reload} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <AdocaoCard adocao={item} showRequester onPress={() => router.push({ pathname: '/adocoes/[id]', params: { id: item.id } })} />
      )}
      ListEmptyComponent={loading ? null : <EmptyState title="Nenhum pedido aqui" />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, gap: spacing.md },
});
