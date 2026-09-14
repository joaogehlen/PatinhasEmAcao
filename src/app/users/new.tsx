import { useRouter } from 'expo-router';

import { UserForm } from '@/presentation/components/UserForm';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';

export default function NewUserScreen() {
  const { users } = useServices();
  const actor = useCurrentUser();
  const router = useRouter();

  return (
    <UserForm
      submitLabel="Criar usuário"
      withPassword
      withRole
      onSubmit={async (input) => {
        await users.create(actor, input);
        router.back();
      }}
    />
  );
}
