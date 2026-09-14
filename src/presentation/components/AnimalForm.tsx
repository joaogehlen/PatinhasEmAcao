import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import {
  ANIMAL_SEXES,
  ANIMAL_SIZES,
  ANIMAL_SPECIES,
  ANIMAL_STATUSES,
  ANIMAL_TEMPERAMENTS,
  SEX_LABELS,
  SIZE_LABELS,
  SPECIES_LABELS,
  STATUS_LABELS,
  TEMPERAMENT_LABELS,
  type Animal,
  type AnimalSex,
  type AnimalSize,
  type AnimalSpecies,
  type AnimalStatus,
  type AnimalTemperament,
} from '@/domain/entities/Animal';

import { describeError } from '../format';
import { spacing } from '../theme';
import { PhotoPicker } from './PhotoPicker';
import { Button, Card, ChipSelect, FormError, SectionHeader, TextField } from './ui';

export interface AnimalFormSubmit {
  input: Record<string, unknown>;
  initialStatus: AnimalStatus;
}

interface AnimalFormProps {
  initial?: Animal;
  submitLabel: string;
  /** Exibe a escolha de status inicial (apenas no cadastro, para voluntários/admins). */
  showInitialStatus?: boolean;
  onSubmit: (data: AnimalFormSubmit) => Promise<void>;
}

/**
 * O formulário guarda tudo como texto/seleção e só converte na hora de
 * enviar. A validação de verdade acontece no serviço (zod), e os erros
 * voltam por campo.
 */
export function AnimalForm({ initial, submitLabel, showInitialStatus = false, onSubmit }: AnimalFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [species, setSpecies] = useState<AnimalSpecies | null>(initial?.species ?? null);
  const [size, setSize] = useState<AnimalSize | null>(initial?.size ?? null);
  const [sex, setSex] = useState<AnimalSex | null>(initial?.sex ?? 'desconhecido');
  const [age, setAge] = useState(initial?.ageMonths?.toString() ?? '');
  const [temperament, setTemperament] = useState<AnimalTemperament | null>(initial?.temperament ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [healthNotes, setHealthNotes] = useState(initial?.healthNotes ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(initial?.photoUri ?? null);
  const [initialStatus, setInitialStatus] = useState<AnimalStatus | null>('denunciado');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await onSubmit({
        input: {
          name,
          species,
          size,
          sex,
          ageMonths: age.trim() === '' ? null : Number(age.replace(',', '.')),
          temperament,
          description,
          healthNotes,
          photoUri,
          // GPS entra na Sprint 2; mantém coordenadas existentes na edição.
          latitude: initial?.latitude ?? null,
          longitude: initial?.longitude ?? null,
        },
        initialStatus: initialStatus ?? 'denunciado',
      });
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
        <FormError message={error} />
        <PhotoPicker uri={photoUri} onChange={setPhotoUri} />

        <Card>
          <SectionHeader title="Identificação" icon="paw" />
          <TextField
            label="Nome"
            icon="edit"
            value={name}
            onChangeText={setName}
            placeholder='Use "Sem nome" se não souber'
            error={fieldErrors.name}
          />
          <ChipSelect label="Espécie" options={ANIMAL_SPECIES} labels={SPECIES_LABELS} value={species} onChange={setSpecies} error={fieldErrors.species} />
          <ChipSelect label="Sexo" options={ANIMAL_SEXES} labels={SEX_LABELS} value={sex} onChange={setSex} error={fieldErrors.sex} />
        </Card>

        <Card>
          <SectionHeader title="Características" icon="sparkles" />
          <ChipSelect label="Porte" options={ANIMAL_SIZES} labels={SIZE_LABELS} value={size} onChange={setSize} error={fieldErrors.size} />
          <TextField
            label="Idade aproximada (meses)"
            icon="cake"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="Deixe vazio se desconhecida"
            error={fieldErrors.ageMonths}
          />
          <ChipSelect
            label="Temperamento"
            options={ANIMAL_TEMPERAMENTS}
            labels={TEMPERAMENT_LABELS}
            value={temperament}
            onChange={setTemperament}
            allowClear
            error={fieldErrors.temperament}
          />
        </Card>

        <Card>
          <SectionHeader title="Detalhes" icon="info" />
          <TextField
            label="Descrição"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Onde foi visto, condição, características marcantes..."
            error={fieldErrors.description}
          />
          <TextField
            label="Observações de saúde (opcional)"
            value={healthNotes}
            onChangeText={setHealthNotes}
            multiline
            placeholder="Vacinas, castração, ferimentos, medicação..."
            error={fieldErrors.healthNotes}
          />
          {showInitialStatus && (
            <ChipSelect
              label="Situação inicial"
              options={ANIMAL_STATUSES.filter((status) => status !== 'adotado')}
              labels={STATUS_LABELS}
              value={initialStatus}
              onChange={setInitialStatus}
            />
          )}
        </Card>

        <Button title={submitLabel} icon="check" onPress={handleSubmit} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 56, gap: spacing.lg },
});
