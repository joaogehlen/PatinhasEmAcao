import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, FormError, PasswordField } from '@/presentation/components/ui';
import { describeError } from '@/presentation/format';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { spacing } from '@/presentation/theme';

export default function ChangePasswordScreen() {
  const user = useCurrentUser();
  const { users } = useServices();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (newPassword !== confirmation) {
      setError('A confirmação não confere com a nova senha.');
      return;
    }
    setSaving(true);
    try {
      await users.changePassword(user, currentPassword, newPassword);
      Alert.alert('Pronto!', 'Sua senha foi alterada.');
      router.back();
    } catch (err) {
      const { message, fieldErrors } = describeError(err);
      setError(fieldErrors.password ?? message);
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <FormError message={error} />
      <Card>
        <PasswordField label="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} />
        <PasswordField label="Nova senha" value={newPassword} onChangeText={setNewPassword} />
        <PasswordField label="Confirme a nova senha" value={confirmation} onChangeText={setConfirmation} />
      </Card>
      <Button title="Salvar nova senha" icon="check" onPress={handleSubmit} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg },
});
