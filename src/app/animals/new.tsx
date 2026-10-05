import { useRouter } from 'expo-router';

import { AnimalForm } from '@/presentation/components/AnimalForm';
import { useAuth, useCurrentUser, useServices } from '@/presentation/providers/AppProviders';

export default function NewAnimalScreen() {
  const { animals } = useServices();
  const user = useCurrentUser();
  const { can } = useAuth();
  const router = useRouter();

  return (
    <AnimalForm
      submitLabel="Registrar"
      showInitialStatus={can('animal:changeStatus')}
      onSubmit={async ({ input, initialStatus }) => {
        const animal = await animals.create(user, input, initialStatus);
        // Sem internet a denúncia fica na fila, e o detalhe a mostra como pendente.
        router.replace(`/animals/${animal.id}`);
      }}
    />
  );
}
