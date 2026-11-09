import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { AppText, Button, FormError, PasswordField, TextField } from '@/presentation/components/ui';
import { describeError } from '@/presentation/format';
import { useAuth } from '@/presentation/providers/AppProviders';
import { colors, spacing } from '@/presentation/theme';

/**
 * Cadastro com o mínimo que a conta exige: nome, e-mail e senha. Telefone e
 * foto ficam para Perfil › Meus dados — quem chega aqui quer entrar logo, às
 * vezes no meio de uma denúncia.
 */
export default function SignUpScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (field: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await register({ ...form, phone: null });
    } catch (err) {
      const described = describeError(err);
      setError(described.message);
      setFieldErrors(described.fieldErrors);
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AppText variant="title">Crie sua conta</AppText>
        <AppText variant="body" color={colors.textMuted} style={styles.hint}>
          Telefone e foto você completa depois, no seu perfil.
        </AppText>

        <FormError message={error} />
        <TextField
          label="Nome completo"
          icon="person"
          value={form.name}
          onChangeText={set('name')}
          autoComplete="name"
          autoCapitalize="words"
          error={fieldErrors.name}
        />
        <TextField
          label="E-mail"
          icon="mail"
          value={form.email}
          onChangeText={set('email')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          error={fieldErrors.email}
        />
        <PasswordField
          label="Senha"
          placeholder="Mínimo de 6 caracteres"
          value={form.password}
          onChangeText={set('password')}
          autoComplete="new-password"
          onSubmitEditing={handleSubmit}
          error={fieldErrors.password}
        />
        <Button title="Criar conta" icon="check" onPress={handleSubmit} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.xl, paddingTop: spacing.sm, paddingBottom: 48 },
  hint: { marginTop: spacing.xs, marginBottom: spacing.lg },
});
