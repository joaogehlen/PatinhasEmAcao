import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { USER_ROLE_LABELS } from '@/domain/entities/User';
import { DEMO_ACCOUNTS } from '@/infrastructure/database/seed';
import { Icon } from '@/presentation/components/Icon';
import { HeroIllustration, PawPattern } from '@/presentation/components/Illustrations';
import { AppText, Button, FormError, PasswordField, TextField } from '@/presentation/components/ui';
import { describeError } from '@/presentation/format';
import { useAuth } from '@/presentation/providers/AppProviders';
import { colors, gradients, radius, roleStyles, shadows, spacing } from '@/presentation/theme';

export default function SignInScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await login({ email, password });
      // A navegação acontece sozinha: o Stack.Protected libera as abas.
    } catch (err) {
      const described = describeError(err);
      setError(described.message);
      setFieldErrors(described.fieldErrors);
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}
        >
          <PawPattern />
          <HeroIllustration size={140} />
          <AppText variant="display" color={colors.white} style={styles.center}>
            Patinhas em Ação
          </AppText>
          <AppText variant="bodyStrong" color="rgba(255,255,255,0.92)" style={styles.center}>
            Juntos por cada focinho de Arvorezinha
          </AppText>
        </LinearGradient>

        <View style={styles.sheet}>
          <AppText variant="title">Bem-vindo de volta</AppText>
          <AppText variant="body" color={colors.textMuted} style={styles.subtitle}>
            Entre para denunciar, acompanhar resgates e encontrar um novo amigo.
          </AppText>

          <FormError message={error} />
          <TextField
            icon="mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            error={fieldErrors.email}
          />
          <PasswordField
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            autoComplete="password"
            error={fieldErrors.password}
            onSubmitEditing={handleSubmit}
          />

          <Button title="Entrar" icon="paw" onPress={handleSubmit} loading={submitting} />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <AppText variant="caption" color={colors.textMuted}>
              ou
            </AppText>
            <View style={styles.divider} />
          </View>

          <Button title="Criar uma conta" variant="outline" onPress={() => router.push('/sign-up')} />

          <View style={styles.demo}>
            <View style={styles.demoHeader}>
              <Icon name="sparkles" size={16} color={colors.primary} />
              <AppText variant="overline" color={colors.textMuted}>
                Experimente com uma conta demo
              </AppText>
            </View>
            <View style={styles.demoRow}>
              {DEMO_ACCOUNTS.map((account) => {
                const tone = roleStyles[account.role];
                const selected = email === account.email;
                return (
                  <Pressable
                    key={account.email}
                    onPress={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                    style={({ pressed }) => [
                      styles.demoCard,
                      selected && { borderColor: tone.text },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <View style={[styles.demoIcon, { backgroundColor: tone.background }]}>
                      <Icon name={tone.icon} size={18} color={tone.text} />
                    </View>
                    <AppText variant="label" style={styles.center}>
                      {USER_ROLE_LABELS[account.role]}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl + spacing.xl,
    overflow: 'hidden',
  },
  center: { textAlign: 'center' },
  sheet: {
    flex: 1,
    marginTop: -spacing.xxl,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.xl },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  demo: { marginTop: spacing.xl, gap: spacing.md },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center' },
  demoRow: { flexDirection: 'row', gap: spacing.sm },
  demoCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadows.card,
  },
  demoIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
