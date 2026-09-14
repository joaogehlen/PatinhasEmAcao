import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import type { Vaquinha } from '@/domain/entities/Vaquinha';

import { describeError, formatMoney, parseMoney } from '../format';
import { colors, radius, rules, spacing } from '../theme';
import { AppText, Button, Card, FormError, SectionHeader, TextField } from './ui';

interface VaquinhaFormProps {
  initial?: Vaquinha;
  submitLabel: string;
  onSubmit: (input: Record<string, unknown>) => Promise<void>;
  footer?: ReactNode;
}

/** Centavos para o texto do campo, sem o símbolo da moeda. */
function centsToInput(cents: number | undefined): string {
  if (cents === undefined) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function VaquinhaForm({ initial, submitLabel, onSubmit, footer }: VaquinhaFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [goal, setGoal] = useState(centsToInput(initial?.goalCents));
  const [raised, setRaised] = useState(centsToInput(initial?.raisedCents ?? 0));
  const [pixKey, setPixKey] = useState(initial?.pixKey ?? '');
  const [active, setActive] = useState(initial?.active ?? true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await onSubmit({
        title,
        description,
        // null quando ilegível: o schema devolve erro de campo em vez de gravar NaN.
        goalCents: parseMoney(goal),
        raisedCents: parseMoney(raised) ?? 0,
        pixKey,
        animalId: initial?.animalId ?? null,
        active,
      });
    } catch (err) {
      const described = describeError(err);
      setError(described.message);
      setFieldErrors(described.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  const goalCents = parseMoney(goal);
  const raisedCents = parseMoney(raised);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FormError message={error} />

        <Card>
          <SectionHeader title="Campanha" icon="donate" />
          <TextField
            label="Título"
            value={title}
            onChangeText={setTitle}
            placeholder="Tratamento da Mel"
            error={fieldErrors.title}
          />
          <TextField
            label="Descrição"
            value={description}
            onChangeText={setDescription}
            placeholder="Para que serve o dinheiro arrecadado"
            multiline
            error={fieldErrors.description}
          />
        </Card>

        <Card>
          <SectionHeader title="Valores" icon="donate" />
          <TextField
            label="Meta (R$)"
            value={goal}
            onChangeText={setGoal}
            keyboardType="decimal-pad"
            placeholder="1.500,00"
            error={fieldErrors.goalCents}
          />
          <TextField
            label="Já arrecadado (R$)"
            value={raised}
            onChangeText={setRaised}
            keyboardType="decimal-pad"
            placeholder="0,00"
            error={fieldErrors.raisedCents}
          />
          {/* O app não confirma pagamento; este número é responsabilidade da ONG. */}
          <AppText variant="caption" color={colors.textMuted}>
            O valor arrecadado é informado por vocês. O app não recebe nem confirma doações.
          </AppText>
          {goalCents !== null && raisedCents !== null && goalCents > 0 && (
            <AppText variant="bodyStrong" color={colors.primary} style={{ marginTop: spacing.sm }}>
              {formatMoney(raisedCents)} de {formatMoney(goalCents)}
            </AppText>
          )}
        </Card>

        <Card>
          <SectionHeader title="Recebimento" icon="copy" />
          <TextField
            label="Chave PIX (opcional)"
            value={pixKey}
            onChangeText={setPixKey}
            autoCapitalize="none"
            placeholder="CNPJ, telefone ou chave aleatória"
            error={fieldErrors.pixKey}
          />

          <Pressable
            onPress={() => setActive((value) => !value)}
            accessibilityRole="switch"
            accessibilityState={{ checked: active }}
            style={styles.switchRow}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Campanha aberta</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                Encerradas somem para os moradores e ficam visíveis só para vocês.
              </AppText>
            </View>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={colors.white}
            />
          </Pressable>
        </Card>

        <Button title={submitLabel} icon="check" onPress={handleSubmit} loading={submitting} />
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 56, gap: spacing.lg },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: rules.hair,
    borderTopColor: colors.border,
    borderRadius: radius.sm,
  },
});
