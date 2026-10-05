import { Image } from 'expo-image';
import { useCallback, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { MAX_VAQUINHA_PHOTOS, type Vaquinha } from '@/domain/entities/Vaquinha';

import { describeError, parseMoney } from '../format';
import { useFocusedQuery } from '../hooks/useFocusedQuery';
import { useServices } from '../providers/AppProviders';
import { colors, radius, rules, spacing, statusStyles } from '../theme';
import { Icon } from './Icon';
import { PhotoGalleryPicker, PhotoPicker } from './PhotoPicker';
import { AppText, Button, Card, FormError, SectionHeader, TextField } from './ui';

interface VaquinhaFormProps {
  initial?: Vaquinha;
  submitLabel: string;
  onSubmit: (input: Record<string, unknown>) => Promise<void>;
  footer?: ReactNode;
}

const PHOTO_FOLDER = 'vaquinhas';

/** Centavos para o texto do campo, sem o símbolo da moeda. */
function centsToInput(cents: number | undefined): string {
  if (cents === undefined) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Criação e edição da campanha.
 *
 * O arrecadado NÃO é campo daqui: ele é a soma dos lançamentos feitos na
 * página da vaquinha, para que a progressão fique registrada.
 */
export function VaquinhaForm({ initial, submitLabel, onSubmit, footer }: VaquinhaFormProps) {
  const [coverUri, setCoverUri] = useState<string | null>(initial?.coverUri ?? null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [details, setDetails] = useState(initial?.details ?? '');
  const [photoUris, setPhotoUris] = useState<string[]>(initial?.photoUris ?? []);
  const [animalId, setAnimalId] = useState<string | null>(initial?.animalId ?? null);
  const [goal, setGoal] = useState(centsToInput(initial?.goalCents));
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
        details,
        coverUri,
        photoUris,
        // null quando ilegível: o schema devolve erro de campo em vez de gravar NaN.
        goalCents: parseMoney(goal),
        pixKey,
        animalId,
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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FormError message={error} />

        <PhotoPicker
          uri={coverUri}
          onChange={setCoverUri}
          aspect={[16, 9]}
          folder={PHOTO_FOLDER}
          title="Capa da campanha"
        />

        <Card>
          <SectionHeader title="Campanha" icon="donate" />
          <TextField
            label="Título"
            value={title}
            onChangeText={setTitle}
            placeholder="Tratamento da Mel"
            maxLength={80}
            error={fieldErrors.title}
          />
          <TextField
            label="Resumo"
            value={description}
            onChangeText={setDescription}
            placeholder="Uma ou duas frases"
            multiline
            maxLength={1000}
            error={fieldErrors.description}
          />
          <TextField
            label="Detalhes (opcional)"
            value={details}
            onChangeText={setDetails}
            placeholder="O que aconteceu e para que serve o dinheiro"
            multiline
            maxLength={5000}
            style={{ minHeight: 140 }}
            error={fieldErrors.details}
          />
        </Card>

        <Card>
          <SectionHeader title="Fotos" icon="gallery" />
          <PhotoGalleryPicker
            uris={photoUris}
            onChange={setPhotoUris}
            max={MAX_VAQUINHA_PHOTOS}
            folder={PHOTO_FOLDER}
            error={fieldErrors.photoUris}
          />
        </Card>

        <Card>
          <SectionHeader title="Animal (opcional)" icon="paw" />
          <AnimalSelect value={animalId} onChange={setAnimalId} />
        </Card>

        <Card>
          <SectionHeader title="Meta" icon="donate" />
          <TextField
            label="Meta (R$)"
            value={goal}
            onChangeText={setGoal}
            keyboardType="decimal-pad"
            placeholder="1.500,00"
            error={fieldErrors.goalCents}
          />
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
            <AppText variant="bodyStrong" style={{ flex: 1 }}>Campanha aberta</AppText>
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

/** Carrossel de animais do catálogo; tocar no selecionado desmarca. */
function AnimalSelect({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { animals } = useServices();
  const query = useCallback(() => animals.list(), [animals]);
  const { data, error } = useFocusedQuery(query);

  if (error) return <FormError message={error} />;
  if (!data) return null;
  if (data.length === 0) {
    return (
      <AppText variant="caption" color={colors.textMuted}>
        Nenhum animal cadastrado ainda.
      </AppText>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.animalRow}>
      {data.map((animal) => {
        const selected = animal.id === value;
        return (
          <Pressable
            key={animal.id}
            onPress={() => onChange(selected ? null : animal.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={animal.name}
            style={[styles.animalTile, selected && styles.animalTileSelected]}
          >
            <View style={styles.animalPhoto}>
              {animal.photoUri ? (
                <Image source={{ uri: animal.photoUri }} contentFit="cover" style={StyleSheet.absoluteFill} />
              ) : (
                <Icon name={statusStyles[animal.status].icon} size={22} color={colors.textMuted} />
              )}
              {selected && (
                <View style={styles.animalCheck}>
                  <Icon name="check" size={14} color={colors.onPrimary} />
                </View>
              )}
            </View>
            <AppText variant="label" numberOfLines={1} color={selected ? colors.primary : colors.text}>
              {animal.name}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
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
  animalRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  animalTile: {
    width: 84,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: rules.base,
    borderColor: 'transparent',
  },
  animalTileSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  animalPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalCheck: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
