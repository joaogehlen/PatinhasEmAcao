import { useRouter } from 'expo-router';

import { NoticiaForm } from '@/presentation/components/NoticiaForm';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';

export default function NewNoticiaScreen() {
  const { noticias } = useServices();
  const actor = useCurrentUser();
  const router = useRouter();

  return (
    <NoticiaForm
      submitLabel="Publicar"
      onSubmit={async (input) => {
        const created = await noticias.create(actor, input);
        router.replace({ pathname: '/noticias/[id]', params: { id: created.id } });
      }}
    />
  );
}
