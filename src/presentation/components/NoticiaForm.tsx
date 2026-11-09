import { useCallback, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';

import { MAX_NOTICIA_PHOTOS, type Noticia } from '@/domain/entities/Noticia';

import { describeError } from '../format';
import { useFocusedQuery } from '../hooks/useFocusedQuery';
import { useCurrentUser, useServices } from '../providers/AppProviders';
import { colors, spacing } from '../theme';
import { PhotoGalleryPicker, PhotoPicker } from './PhotoPicker';
import { AnimalSelect } from './VaquinhaForm';
import { AppText, Button, Card, ChipSelect, FormError, SectionHeader, TextField } from './ui';

interface NoticiaFormProps {
  initial?: Noticia;
  submitLabel: string;
  onSubmit: (input: Record<string, unknown>) => Promise<void>;
  footer?: ReactNode;
}

const PHOTO_FOLDER = 'noticias';

type LinkKind = 'animal' | 'vaquinha';
const LINK_KINDS = ['animal', 'vaquinha'] as const;
const LINK_LABELS: Record<LinkKind, string> = { animal: 'Animal', vaquinha: 'Vaquinha' };

/** Publicação e edição de notícia do mural. */
export function NoticiaForm({ initial, submitLabel, onSubmit, footer }: NoticiaFormProps) {
  const [coverUri, setCoverUri] = useState<string | null>(initial?.coverUri ?? null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [photoUris, setPhotoUris] = useState<string[]>(initial?.photoUris ?? []);
  const [link, setLink] = useState<LinkKind | null>(
    initial?.animalId ? 'animal' : initial?.vaquinhaId ? 'vaquinha' : null,
  );
  const [animalId, setAnimalId] = useState<string | null>(initial?.animalId ?? null);
  const [vaquinhaId, setVaquinhaId] = useState<string | null>(initial?.vaquinhaId ?? null);
  const [pinned, setPinned] = useState(initial?.pinned ?? false);

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
        body,
        coverUri,
        photoUris,
        // Só o vínculo escolhido vai: trocar de tipo descarta o outro.
        animalId: link === 'animal' ? animalId : null,
        vaquinhaId: link === 'vaquinha' ? vaquinhaId : null,
        pinned,
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

        <PhotoPicker uri={coverUri} onChange={setCoverUri} aspect={[16, 9]} folder={PHOTO_FOLDER} title="Capa da notícia" />

        <Card>
          <SectionHeader title="Notícia" icon="news" />
          <TextField
            label="Título"
            value={title}
            onChangeText={setTitle}
            placeholder="Mel foi adotada!"
            maxLength={100}
            error={fieldErrors.title}
          />
          <TextField
            label="Texto"
            value={body}
            onChangeText={setBody}
            placeholder="Conte o que aconteceu"
            multiline
            maxLength={5000}
            style={{ minHeight: 140 }}
            error={fieldErrors.body}
          />
        </Card>

        <Card>
          <SectionHeader title="Fotos" icon="gallery" />
          <PhotoGalleryPicker
            uris={photoUris}
            onChange={setPhotoUris}
            max={MAX_NOTICIA_PHOTOS}
            folder={PHOTO_FOLDER}
            error={fieldErrors.photoUris}
          />
        </Card>

        <Card>
          <SectionHeader title="Vincular (opcional)" icon="paw" />
          <ChipSelect options={LINK_KINDS} labels={LINK_LABELS} value={link} onChange={setLink} allLabel="Nenhum" />
          {link === 'animal' && <AnimalSelect value={animalId} onChange={setAnimalId} />}
          {link === 'vaquinha' && <VaquinhaSelect value={vaquinhaId} onChange={setVaquinhaId} />}
          {fieldErrors.vaquinhaId ? (
            <AppText variant="caption" color={colors.danger}>
              {fieldErrors.vaquinhaId}
            </AppText>
          ) : null}
        </Card>

        <Card>
          <Pressable
            onPress={() => setPinned((value) => !value)}
            accessibilityRole="switch"
            accessibilityState={{ checked: pinned }}
            style={styles.switchRow}
          >
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              Fixar no topo do mural
            </AppText>
            <Switch
              value={pinned}
              onValueChange={setPinned}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={colors.white}
            />
          </Pressable>
          {pinned && (
            <AppText variant="caption" color={colors.textMuted}>
              A notícia fixada antes deixa de ser fixada.
            </AppText>
          )}
        </Card>

        <Button title={submitLabel} icon="check" onPress={handleSubmit} loading={submitting} />
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Lista de vaquinhas para vincular; tocar na selecionada desmarca. */
function VaquinhaSelect({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { vaquinhas } = useServices();
  const actor = useCurrentUser();
  const query = useCallback(() => vaquinhas.list(actor), [vaquinhas, actor]);
  const { data, error } = useFocusedQuery(query);

  if (error) return <FormError message={error} />;
  if (!data) return null;
  if (data.length === 0) {
    return (
      <AppText variant="caption" color={colors.textMuted}>
        Nenhuma vaquinha cadastrada ainda.
      </AppText>
    );
  }
  return (
    <ChipSelect
      options={data.map((vaquinha) => vaquinha.id)}
      labels={Object.fromEntries(data.map((vaquinha) => [vaquinha.id, vaquinha.title]))}
      value={value}
      onChange={onChange}
      allowClear
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 56, gap: spacing.lg },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
