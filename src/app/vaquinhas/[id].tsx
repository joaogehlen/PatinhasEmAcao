import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { VaquinhaForm } from '@/presentation/components/VaquinhaForm';
import { Button, FormError } from '@/presentation/components/ui';
import { describeError } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, spacing } from '@/presentation/theme';

export default function EditVaquinhaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vaquinhas } = useServices();
  const actor = useCurrentUser();
  const router = useRouter();

  const query = useCallback(() => vaquinhas.getById(actor, id), [vaquinhas, actor, id]);
  const { data, error, loading } = useFocusedQuery(query);

  if (loading && !data) return <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />;
  if (!data) {
    return (
      <View style={{ padding: spacing.xl }}>
        <FormError message={error ?? 'Vaquinha não encontrada.'} />
      </View>
    );
  }

  function confirmDelete() {
    Alert.alert('Excluir vaquinha', `Deseja excluir "${data!.title}"? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await vaquinhas.delete(actor, data!.id);
            router.back();
          } catch (err) {
            Alert.alert('Não foi possível excluir', describeError(err).message);
          }
        },
      },
    ]);
  }

  return (
    <VaquinhaForm
      initial={data}
      submitLabel="Salvar alterações"
      onSubmit={async (input) => {
        await vaquinhas.update(actor, data.id, input);
        router.back();
      }}
      footer={<Button title="Excluir vaquinha" icon="trash" variant="danger" onPress={confirmDelete} />}
    />
  );
}
