import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/presentation/components/Icon';
import { AppText, Button, FormError, PasswordField, TextField } from '@/presentation/components/ui';
import { describeError } from '@/presentation/format';
import { useAuth } from '@/presentation/providers/AppProviders';
import { colors, radius, rules, spacing } from '@/presentation/theme';

/**
 * Entrada do app.
 *
 * Direção fixada: escuro e premium. A tela é uma coisa só — marca, dois
 * campos, uma ação — com respiro suficiente para que nada precise competir.
 * Sem contas de demonstração: quem apresenta digita as credenciais.
 */
export default function SignInScreen() {
  const { login, continueAsGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleGuest() {
    setEntering(true);
    setError(null);
    try {
      await continueAsGuest();
    } catch (err) {
      setError(describeError(err).message);
      setEntering(false);
    }
  }

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
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* O bloco centra verticalmente: sem isso a tela fica com a metade de
            baixo vazia, que lê como inacabada em vez de espaçosa. */}
        <View style={styles.center}>
          <View style={styles.brand}>
            <AppText variant="display">Patinhas em Ação</AppText>
            <AppText variant="body" color={colors.textMuted}>
              Arvorezinha · Rio Grande do Sul
            </AppText>
          </View>

          <View style={styles.form}>
            <FormError message={error} />

            <TextField
              icon="mail"
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              error={fieldErrors.email}
            />
            <PasswordField
              icon="lock"
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              autoComplete="password"
              error={fieldErrors.password}
              onSubmitEditing={handleSubmit}
            />

            <Button title="Entrar" onPress={handleSubmit} loading={submitting} />

            {/*
              O caminho sem conta fica aqui, no mesmo peso visual de uma ação
              secundária: quem está na rua com um animal ferido não deveria
              precisar criar cadastro antes de avisar.
            */}
            <Pressable
              onPress={handleGuest}
              accessibilityRole="button"
              disabled={entering}
              style={({ pressed }) => [styles.guest, pressed && { opacity: 0.75 }]}
            >
              <Icon name="megaphone" size={18} color={colors.text} />
              <AppText variant="bodyStrong">
                {entering ? 'Entrando…' : 'Só quero avisar sobre um animal'}
              </AppText>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <AppText variant="body" color={colors.textMuted}>
            Ainda não tem conta?
          </AppText>
          <Pressable onPress={() => router.push('/sign-up')} accessibilityRole="button" hitSlop={10}>
            <AppText variant="bodyStrong" color={colors.primary}>
              Criar conta
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl },

  center: { flex: 1, justifyContent: 'center' },
  brand: { gap: spacing.sm, marginBottom: 44 },
  form: { gap: spacing.xs },
  guest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: rules.hair,
    borderColor: colors.borderStrong,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
});
