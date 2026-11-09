import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { NoticiaForm } from '@/presentation/components/NoticiaForm';
import { Button, FormError } from '@/presentation/components/ui';
import { describeError } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, spacing } from '@/presentation/theme';

export default function EditNoticiaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { noticias } = useServices();
  const actor = useCurrentUser();
  const router = useRouter();

  const query = useCallback(() => noticias.getById(actor, id), [noticias, actor, id]);
  const { data, error, loading } = useFocusedQuery(query);

  if (loading && !data) return <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />;
  if (!data) {
    return (
      <View style={{ padding: spacing.xl }}>
        <FormError message={error ?? 'Notícia não encontrada.'} />
      </View>
    );
  }

  function confirmDelete() {
    Alert.alert('Excluir notícia', `Deseja excluir "${data!.title}"? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await noticias.delete(actor, data!.id);
            // Fecha a edição e a página da notícia, que deixou de existir.
            router.dismiss(2);
          } catch (err) {
            Alert.alert('Não foi possível excluir', describeError(err).message);
          }
        },
      },
    ]);
  }

  return (
    <NoticiaForm
      initial={data}
      submitLabel="Salvar alterações"
      onSubmit={async (input) => {
        await noticias.update(actor, data.id, input);
        router.back();
      }}
      footer={<Button title="Excluir notícia" icon="trash" variant="danger" onPress={confirmDelete} />}
    />
  );
}
