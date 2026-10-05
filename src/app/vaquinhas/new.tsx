import { useRouter } from 'expo-router';

import { VaquinhaForm } from '@/presentation/components/VaquinhaForm';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';

export default function NewVaquinhaScreen() {
  const { vaquinhas } = useServices();
  const actor = useCurrentUser();
  const router = useRouter();

  return (
    <VaquinhaForm
      submitLabel="Criar vaquinha"
      onSubmit={async (input) => {
        const created = await vaquinhas.create(actor, input);
        // Abre a página da campanha, onde se lançam os primeiros valores.
        router.replace({ pathname: '/vaquinhas/[id]', params: { id: created.id } });
      }}
    />
  );
}
