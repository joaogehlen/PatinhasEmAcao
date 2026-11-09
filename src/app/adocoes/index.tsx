import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { AdocaoCard } from '@/presentation/components/AdocaoCard';
import { EmptyState, FormError } from '@/presentation/components/ui';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, spacing } from '@/presentation/theme';

/** Pedidos de adoção de quem está logado, mais recentes primeiro. */
export default function MyAdocoesScreen() {
  const { adocoes } = useServices();
  const actor = useCurrentUser();
  const router = useRouter();

  const query = useCallback(() => adocoes.mine(actor), [adocoes, actor]);
  const { data, error, loading, reload } = useFocusedQuery(query);

  return (
    <FlatList
      style={styles.container}
      data={data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={<FormError message={error} />}
      refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={reload} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <AdocaoCard adocao={item} onPress={() => router.push({ pathname: '/adocoes/[id]', params: { id: item.id } })} />
      )}
      ListEmptyComponent={
        loading ? undefined : (
          <EmptyState
            title="Nenhum pedido ainda"
            message="Na página de um animal disponível, toque em Quero adotar."
            action={{ label: 'Ver animais', onPress: () => router.push('/catalog') }}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, gap: spacing.md },
});
