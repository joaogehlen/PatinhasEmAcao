import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/presentation/components/Icon';
import { AppText, Button, FormError, PasswordField, TextField } from '@/presentation/components/ui';
import { describeError } from '@/presentation/format';
import { useAuth } from '@/presentation/providers/AppProviders';
import { colors, spacing } from '@/presentation/theme';

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: 'megaphone', text: 'Denuncie animais em risco com foto' },
  { icon: 'clock', text: 'Acompanhe cada etapa do resgate' },
  { icon: 'heart', text: 'Encontre um amigo para adotar' },
];

export default function SignUpScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (field: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await register(form);
    } catch (err) {
      const described = describeError(err);
      setError(described.message);
      setFieldErrors(described.fieldErrors);
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AppText variant="title">Crie sua conta</AppText>
        <AppText variant="body" color={colors.textMuted} style={styles.subtitle}>
          Faça parte da rede que protege os animais da nossa cidade.
        </AppText>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.text} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Icon name={benefit.icon} size={16} color={colors.secondaryDark} />
              </View>
              <AppText variant="bodyStrong" color={colors.textSoft}>
                {benefit.text}
              </AppText>
            </View>
          ))}
        </View>

        <FormError message={error} />
        <TextField label="Nome completo" icon="person" value={form.name} onChangeText={set('name')} error={fieldErrors.name} />
        <TextField
          label="E-mail"
          icon="mail"
          value={form.email}
          onChangeText={set('email')}
          autoCapitalize="none"
          keyboardType="email-address"
          error={fieldErrors.email}
        />
        <TextField
          label="Telefone (opcional)"
          icon="phone"
          value={form.phone}
          onChangeText={set('phone')}
          keyboardType="phone-pad"
          placeholder="(51) 99999-9999"
          error={fieldErrors.phone}
        />
        <PasswordField
          label="Senha"
          placeholder="Mínimo de 6 caracteres"
          value={form.password}
          onChangeText={set('password')}
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
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  benefits: { gap: spacing.sm, marginBottom: spacing.xl },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
