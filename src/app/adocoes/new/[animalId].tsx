import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { HOUSING_LABELS, HOUSING_TYPES, type HousingType } from '@/domain/entities/Adocao';
import { AppText, Button, Card, ChipSelect, FormError, SectionHeader, TextField } from '@/presentation/components/ui';
import { describeError } from '@/presentation/format';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, spacing } from '@/presentation/theme';

const YES_NO = ['sim', 'nao'] as const;
type YesNo = (typeof YES_NO)[number];
const YES_NO_LABELS: Record<YesNo, string> = { sim: 'Sim', nao: 'Não' };
const toBool = (value: YesNo | null) => (value === null ? null : value === 'sim');

/**
 * Formulário de adoção. As perguntas são as que a ONG faz hoje na conversa:
 * moradia, pátio, outros animais, crianças, experiência e motivo.
 */
export default function NewAdocaoScreen() {
  const { animalId } = useLocalSearchParams<{ animalId: string }>();
  const { adocoes } = useServices();
  const actor = useCurrentUser();
  const router = useRouter();

  const [housing, setHousing] = useState<HousingType | null>(null);
  const [hasYard, setHasYard] = useState<YesNo | null>(null);
  const [otherAnimals, setOtherAnimals] = useState('');
  const [hasChildren, setHasChildren] = useState<YesNo | null>(null);
  const [experience, setExperience] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await adocoes.request(actor, animalId, {
        housing,
        hasYard: toBool(hasYard),
        otherAnimals,
        hasChildren: toBool(hasChildren),
        experience,
        reason,
      });
      router.replace({ pathname: '/adocoes/[id]', params: { id: created.id } });
    } catch (err) {
      const described = describeError(err);
      setError(described.message);
      setFieldErrors(described.fieldErrors);
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AppText variant="body" color={colors.textSoft}>
          A ONG avalia cada pedido e entra em contato. Você acompanha a situação em Perfil › Meus pedidos de adoção.
        </AppText>
        <FormError message={error} />

        <Card>
          <SectionHeader title="Sua casa" icon="home" />
          <ChipSelect label="Moradia" options={HOUSING_TYPES} labels={HOUSING_LABELS} value={housing} onChange={setHousing} error={fieldErrors.housing} />
          <ChipSelect label="Tem pátio ou área cercada?" options={YES_NO} labels={YES_NO_LABELS} value={hasYard} onChange={setHasYard} error={fieldErrors.hasYard} />
          <ChipSelect
            label="Mora alguma criança na casa?"
            options={YES_NO}
            labels={YES_NO_LABELS}
            value={hasChildren}
            onChange={setHasChildren}
            error={fieldErrors.hasChildren}
          />
          <TextField
            label="Outros animais (opcional)"
            value={otherAnimals}
            onChangeText={setOtherAnimals}
            placeholder="Ex.: uma gata castrada de 3 anos"
            maxLength={300}
            error={fieldErrors.otherAnimals}
          />
        </Card>

        <Card>
          <SectionHeader title="Sobre você" icon="person" />
          <TextField
            label="Experiência com animais (opcional)"
            value={experience}
            onChangeText={setExperience}
            placeholder="Já teve cachorro ou gato?"
            multiline
            maxLength={500}
            error={fieldErrors.experience}
          />
          <TextField
            label="Por que quer adotar?"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={1000}
            style={{ minHeight: 110 }}
            error={fieldErrors.reason}
          />
        </Card>

        <Button title="Enviar pedido" icon="check" onPress={handleSubmit} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 56, gap: spacing.lg },
});
