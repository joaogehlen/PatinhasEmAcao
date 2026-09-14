import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { UserForm } from '@/presentation/components/UserForm';
import { Button, FormError } from '@/presentation/components/ui';
import { describeError } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useAuth, useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, spacing } from '@/presentation/theme';

export default function EditUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { users } = useServices();
  const actor = useCurrentUser();
  const { setUser } = useAuth();
  const router = useRouter();

  const query = useCallback(() => users.getById(actor, id), [users, actor, id]);
  const { data: target, error, loading } = useFocusedQuery(query);

  if (loading && !target) return <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />;
  if (!target) {
    return (
      <View style={{ padding: spacing.xl }}>
        <FormError message={error ?? 'Usuário não encontrado.'} />
      </View>
    );
  }

  function confirmDelete() {
    Alert.alert('Excluir usuário', `Deseja excluir a conta de ${target!.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await users.delete(actor, target!.id);
            router.back();
          } catch (err) {
            Alert.alert('Não foi possível excluir', describeError(err).message);
          }
        },
      },
    ]);
  }

  return (
    <UserForm
      initial={target}
      submitLabel="Salvar alterações"
      withRole
      onSubmit={async (input) => {
        const updated = await users.update(actor, target.id, input);
        if (updated.id === actor.id) setUser(updated);
        router.back();
      }}
      footer={
        target.id !== actor.id ? <Button title="Excluir usuário" icon="trash" variant="danger" onPress={confirmDelete} /> : null
      }
    />
  );
}
