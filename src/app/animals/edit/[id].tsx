import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AnimalForm } from '@/presentation/components/AnimalForm';
import { FormError } from '@/presentation/components/ui';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, spacing } from '@/presentation/theme';

export default function EditAnimalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { animals } = useServices();
  const user = useCurrentUser();
  const router = useRouter();

  const query = useCallback(() => animals.getById(id), [animals, id]);
  const { data: animal, error, loading } = useFocusedQuery(query);

  if (loading && !animal) return <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />;
  if (!animal) {
    return (
      <View style={{ padding: spacing.lg }}>
        <FormError message={error ?? 'Animal não encontrado.'} />
      </View>
    );
  }

  return (
    <AnimalForm
      initial={animal}
      submitLabel="Salvar alterações"
      onSubmit={async ({ input }) => {
        await animals.update(user, animal.id, input);
        router.back();
      }}
    />
  );
}
