import { useRouter } from 'expo-router';

import { UserForm } from '@/presentation/components/UserForm';
import { useAuth, useCurrentUser, useServices } from '@/presentation/providers/AppProviders';

export default function EditProfileScreen() {
  const user = useCurrentUser();
  const { setUser, can } = useAuth();
  const { users } = useServices();
  const router = useRouter();

  return (
    <UserForm
      initial={user}
      submitLabel="Salvar"
      withRole={can('user:manage')}
      onSubmit={async (input) => {
        setUser(await users.update(user, user.id, input));
        router.back();
      }}
    />
  );
}
