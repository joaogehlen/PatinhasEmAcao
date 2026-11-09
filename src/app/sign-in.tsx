import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARAMELO_SIZE, Caramelo, type Mood } from '@/presentation/components/Caramelo';
import { Icon } from '@/presentation/components/Icon';
import { AppText, Button, TextField } from '@/presentation/components/ui';
import { describeError } from '@/presentation/format';
import { useReducedMotion } from '@/presentation/hooks/useReducedMotion';
import { useAuth } from '@/presentation/providers/AppProviders';
import { colors, spacing } from '@/presentation/theme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Entrada do app.
 *
 * Uma cor chapada e um personagem: o Caramelo. Ele é a única decoração da tela
 * e o lugar onde o estado aparece além do texto — olha o e-mail sendo
 * digitado, fecha os olhos na senha, espia quando ela fica visível, balança
 * enquanto carrega, murcha e treme no erro, e no acerto a cor dele toma a tela.
 * Sem contas de demonstração: quem apresenta digita as credenciais.
 */
export default function SignInScreen() {
  const { user, login, continueAsGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focus, setFocus] = useState<'email' | 'password' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [entering, setEntering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const intro = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const flood = useRef(new Animated.Value(0)).current;

  // Entrada: o Caramelo salta para o lugar com mola; o resto chega depois.
  useEffect(() => {
    if (reduced) {
      intro.setValue(1);
      content.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(intro, { toValue: 1, damping: 11, stiffness: 170, mass: 0.8, useNativeDriver: true }),
      Animated.timing(content, { toValue: 1, duration: 380, delay: 180, easing: EASE_OUT, useNativeDriver: true }),
    ]).start();
  }, [reduced, intro, content]);

  // Carregando: balança no lugar.
  useEffect(() => {
    if (!submitting || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -7, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      bob.setValue(0);
    };
  }, [submitting, reduced, bob]);

  function sulk() {
    if (reduced) return;
    Animated.sequence(
      [-8, 7, -5, 3, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 70, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ),
    ).start();
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await login({ email, password });
      // A navegação acontece sozinha (o Stack.Protected libera as abas); a cor
      // do Caramelo cobre a tela como transição enquanto isso.
      setSuccess(true);
      Animated.timing(flood, { toValue: 1, duration: reduced ? 0 : 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } catch (err) {
      const described = describeError(err);
      setError(Object.keys(described.fieldErrors).length > 0 ? null : described.message);
      setFieldErrors(described.fieldErrors);
      setSubmitting(false);
      sulk();
    }
  }

  async function handleGuest() {
    // Já é convidado: a sessão anônima continua de pé, é só ir para o app.
    // Sem histórico (recarregou nesta tela, por exemplo) não há para onde voltar.
    if (user?.isGuest) return router.canGoBack() ? router.back() : router.replace('/');
    setEntering(true);
    setError(null);
    try {
      await continueAsGuest();
    } catch (err) {
      setError(describeError(err).message);
      setEntering(false);
    }
  }

  function clearError() {
    if (error || Object.keys(fieldErrors).length > 0) {
      setError(null);
      setFieldErrors({});
    }
  }

  const failed = Boolean(error) || Object.keys(fieldErrors).length > 0;
  const mood: Mood = failed ? 'sad' : focus === 'password' ? (showPassword ? 'peek' : 'closed') : 'open';
  const look = submitting
    ? { x: 0, y: -3 }
    : focus === 'email'
      ? { x: -4 + 8 * Math.min(1, email.length / 26), y: 3 }
      : { x: 0, y: 0 };
  const reach = Math.hypot(width, height);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.center}>
          <Animated.View
            style={[
              styles.pupWrap,
              success && styles.above,
              {
                opacity: intro.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }),
                transform: [
                  { translateY: Animated.add(bob, intro.interpolate({ inputRange: [0, 1], outputRange: [28, 0] })) },
                  { translateX: shake },
                  { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                ],
              },
            ]}
          >
            {/* Transição de entrada: a cor do Caramelo cresce até cobrir a tela. */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.flood,
                {
                  width: reach * 2,
                  height: reach * 2,
                  borderRadius: reach,
                  opacity: flood.interpolate({ inputRange: [0, 0.01], outputRange: [0, 1], extrapolate: 'clamp' }),
                  transform: [{ scale: flood.interpolate({ inputRange: [0, 1], outputRange: [CARAMELO_SIZE / 2 / reach, 1] }) }],
                },
              ]}
            />
            <Caramelo mood={mood} look={look} reduced={reduced} intro />
          </Animated.View>

          <Animated.View
            style={{
              width: '100%',
              opacity: content,
              transform: [{ translateY: content.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}
          >
            <AppText variant="display" style={styles.greeting} accessibilityRole="header">
              Que bom te ver.
            </AppText>

            <View style={styles.form}>
              {error ? (
                <View style={styles.errorPill} accessibilityLiveRegion="polite">
                  <Icon name="alert" size={16} color={colors.danger} />
                  <AppText variant="bodyStrong" color={colors.text} style={styles.errorText}>
                    {error}
                  </AppText>
                </View>
              ) : null}

              <TextField
                icon="mail"
                placeholder="E-mail"
                accessibilityLabel="E-mail"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearError();
                }}
                onFocus={() => setFocus('email')}
                onBlur={() => setFocus(null)}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                error={fieldErrors.email}
              />
              <TextField
                icon="lock"
                placeholder="Senha"
                accessibilityLabel="Senha"
                value={password}
                secureTextEntry={!showPassword}
                onChangeText={(text) => {
                  setPassword(text);
                  clearError();
                }}
                onFocus={() => setFocus('password')}
                onBlur={() => setFocus(null)}
                onSubmitEditing={handleSubmit}
                autoCapitalize="none"
                autoComplete="password"
                error={fieldErrors.password}
                trailing={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                    hitSlop={12}
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} color={colors.textMuted} />
                  </Pressable>
                }
              />

              <Button title="Entrar" onPress={handleSubmit} loading={submitting} />

              <Pressable
                onPress={handleGuest}
                accessibilityRole="button"
                disabled={entering}
                hitSlop={10}
                style={({ pressed }) => [styles.guest, pressed && { opacity: 0.6 }]}
              >
                <AppText variant="body" color={colors.textMuted}>
                  {entering ? 'Entrando…' : 'Continuar como convidado'}
                </AppText>
              </Pressable>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.footer, { opacity: content }]}>
          <AppText variant="body" color={colors.textMuted}>
            Ainda não tem conta?
          </AppText>
          <Pressable onPress={() => router.push('/sign-up')} accessibilityRole="button" hitSlop={10}>
            <AppText variant="bodyStrong" color={colors.primary}>
              Criar conta
            </AppText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, width: '100%', maxWidth: 480, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pupWrap: { width: CARAMELO_SIZE, height: CARAMELO_SIZE, alignItems: 'center', justifyContent: 'center' },
  above: { zIndex: 10 },
  flood: { position: 'absolute', backgroundColor: colors.primary },
  greeting: { textAlign: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  form: { gap: spacing.xs },
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'center',
    maxWidth: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.dangerSoft,
    marginBottom: spacing.sm,
  },
  errorText: { flexShrink: 1 },
  guest: { alignSelf: 'center', marginTop: spacing.md, minHeight: 44, justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xl },
});
