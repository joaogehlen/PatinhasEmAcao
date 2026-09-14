import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ANIMAL_STATUSES,
  SEX_LABELS,
  SIZE_LABELS,
  SPECIES_LABELS,
  STATUS_LABELS,
  TEMPERAMENT_LABELS,
  type AnimalStatus,
} from '@/domain/entities/Animal';
import { Icon, type IconName } from '@/presentation/components/Icon';
import { StatusBadge } from '@/presentation/components/StatusBadge';
import { AppText, Button, Card, FormError, Pill, SectionHeader } from '@/presentation/components/ui';
import { describeError, formatAge, formatDate, formatDateTime } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useAuth, useServices } from '@/presentation/providers/AppProviders';
import { colors, gradients, radius, shadows, spacing, statusStyles } from '@/presentation/theme';

/** Etapas exibidas na barra de progresso da jornada do animal. */
const JOURNEY: AnimalStatus[] = ANIMAL_STATUSES.filter((status) => status !== 'em_tratamento');

export default function AnimalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { animals } = useServices();
  const { user, can } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const query = useCallback(
    async () => ({ animal: await animals.getById(id), history: await animals.statusHistory(id) }),
    [animals, id],
  );
  const { data, error, loading, reload } = useFocusedQuery(query);
  const [changing, setChanging] = useState(false);

  if (loading && !data) {
    return <ActivityIndicator style={{ marginTop: 120 }} color={colors.primary} />;
  }
  if (!data) {
    return (
      <View style={{ padding: spacing.xl, paddingTop: insets.top + 60 }}>
        <FormError message={error ?? 'Animal não encontrado.'} />
      </View>
    );
  }

  const { animal, history } = data;
  const canEdit = animals.canEdit(user, animal);
  const canDelete = can('animal:delete') && animal.status !== 'adotado';
  const journeyIndex = JOURNEY.indexOf(animal.status === 'em_tratamento' ? 'resgatado' : animal.status);
  const nextStatuses = animals.allowedNextStatuses(user, animal);

  function confirmStatusChange(next: AnimalStatus) {
    Alert.alert(
      STATUS_LABELS[next],
      `Marcar "${animal.name}" como ${STATUS_LABELS[next].toLowerCase()}? A mudança fica registrada no histórico.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setChanging(true);
            try {
              await animals.changeStatus(user!, animal.id, next);
              await reload();
            } catch (err) {
              Alert.alert('Não foi possível alterar', describeError(err).message);
            } finally {
              setChanging(false);
            }
          },
        },
      ],
    );
  }

  function confirmDelete() {
    Alert.alert('Excluir animal', `Deseja excluir "${animal.name}"? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await animals.delete(user!, animal.id);
            router.back();
          } catch (err) {
            Alert.alert('Não foi possível excluir', describeError(err).message);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + (canEdit || canDelete ? 110 : 32) }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {animal.photoUri ? (
            <Image source={{ uri: animal.photoUri }} contentFit="cover" transition={300} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Icon name={statusStyles[animal.status].icon} size={56} color={colors.textMuted} />
            </View>
          )}
          <LinearGradient colors={gradients.photoTop} style={styles.heroShade} />
        </View>

        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="display">{animal.name}</AppText>
              <View style={styles.metaRow}>
                <Icon name="location" size={14} color={colors.textMuted} />
                <AppText variant="caption" color={colors.textMuted}>
                  Arvorezinha/RS · desde {formatDate(animal.createdAt)}
                </AppText>
              </View>
            </View>
            <StatusBadge status={animal.status} />
          </View>

          <View style={styles.tiles}>
            <InfoTile icon="paw" label="Espécie" value={SPECIES_LABELS[animal.species]} />
            <InfoTile icon="ruler" label="Porte" value={SIZE_LABELS[animal.size]} />
            <InfoTile icon="cake" label="Idade" value={formatAge(animal.ageMonths)} />
            <InfoTile icon="person" label="Sexo" value={SEX_LABELS[animal.sex]} />
          </View>

          {animal.temperament && (
            <View style={styles.temperament}>
              <AppText variant="label" color={colors.textMuted}>
                Temperamento
              </AppText>
              <Pill icon="mood" label={TEMPERAMENT_LABELS[animal.temperament]} background={colors.secondarySoft} color={colors.secondaryDark} />
            </View>
          )}

          <View style={styles.section}>
            <SectionHeader title="Sobre" icon="info" />
            <AppText variant="body" color={colors.textSoft}>
              {animal.description}
            </AppText>
          </View>

          {animal.healthNotes && (
            <View style={styles.healthCard}>
              <View style={styles.healthIcon}>
                <Icon name="health" size={20} color={colors.secondaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading" color={colors.secondaryDark}>
                  Saúde
                </AppText>
                <AppText variant="body" color={colors.textSoft}>
                  {animal.healthNotes}
                </AppText>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <SectionHeader title="Jornada" icon="sparkles" subtitle="Do resgate ao novo lar" />
            <Card>
              <View style={styles.journey}>
                {JOURNEY.map((step, index) => {
                  const reached = index <= journeyIndex;
                  return (
                    <View key={step} style={styles.journeyStep}>
                      <View style={styles.journeyTrack}>
                        <View style={[styles.journeyLine, index === 0 && styles.invisible, index <= journeyIndex && styles.journeyLineActive]} />
                        <View style={[styles.journeyDot, reached && { backgroundColor: statusStyles[step].text }]}>
                          <Icon name={statusStyles[step].icon} size={14} color={reached ? colors.white : colors.textMuted} />
                        </View>
                        <View
                          style={[
                            styles.journeyLine,
                            index === JOURNEY.length - 1 && styles.invisible,
                            index < journeyIndex && styles.journeyLineActive,
                          ]}
                        />
                      </View>
                      <AppText variant="label" color={reached ? colors.text : colors.textMuted} style={styles.journeyLabel} numberOfLines={2}>
                        {STATUS_LABELS[step].replace(' para adoção', '')}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </Card>
          </View>

          {/* Avançar a jornada é a operação central do admin: é o que faz o
              registro deixar de ser uma denúncia parada. */}
          {nextStatuses.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Avançar" icon="check" subtitle="Registra a mudança no histórico" />
              <View style={styles.statusActions}>
                {nextStatuses.map((next) => {
                  const tone = statusStyles[next];
                  return (
                    <Pressable
                      key={next}
                      onPress={() => confirmStatusChange(next)}
                      accessibilityRole="button"
                      disabled={changing}
                      style={({ pressed }) => [
                        styles.statusAction,
                        { borderColor: tone.text, backgroundColor: tone.background },
                        pressed && { opacity: 0.8 },
                        changing && { opacity: 0.5 },
                      ]}
                    >
                      <Icon name={tone.icon} size={18} color={tone.text} />
                      <AppText variant="bodyStrong" color={tone.text}>
                        {STATUS_LABELS[next]}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <SectionHeader title="Histórico" icon="clock" />
            <Card>
              {history.map((entry, index) => (
                <View key={entry.id} style={styles.timelineItem}>
                  <View style={styles.timelineMarker}>
                    <View style={[styles.timelineDot, { backgroundColor: statusStyles[entry.toStatus].text }]} />
                    {index < history.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineBody}>
                    <AppText variant="bodyStrong">{STATUS_LABELS[entry.toStatus]}</AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      {formatDateTime(entry.changedAt)}
                    </AppText>
                    {entry.note && (
                      <AppText variant="body" color={colors.textSoft}>
                        {entry.note}
                      </AppText>
                    )}
                  </View>
                </View>
              ))}
            </Card>
          </View>
        </View>
      </ScrollView>

      {(canEdit || canDelete) && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.md }]}>
          {canDelete && <Button title="Excluir" icon="trash" variant="danger" onPress={confirmDelete} style={{ flex: 1 }} />}
          {canEdit && (
            <Button title="Editar" icon="edit" onPress={() => router.push(`/animals/edit/${animal.id}`)} style={{ flex: 2 }} />
          )}
        </View>
      )}
    </View>
  );
}

function InfoTile({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileIcon}>
        <Icon name={icon} size={18} color={colors.primary} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="label" numberOfLines={1} style={{ textAlign: 'center' }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { height: 380, backgroundColor: colors.primarySoft },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  sheet: {
    marginTop: -spacing.xxl,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...shadows.card,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  temperament: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  section: { gap: 0 },
  healthCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.secondarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  healthIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journey: { flexDirection: 'row' },
  journeyStep: { flex: 1, alignItems: 'center', gap: spacing.sm },
  journeyTrack: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  journeyLine: { flex: 1, height: 3, backgroundColor: colors.border },
  journeyLineActive: { backgroundColor: colors.primary },
  invisible: { opacity: 0 },
  journeyDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyLabel: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
  timelineItem: { flexDirection: 'row', gap: spacing.md },
  timelineMarker: { alignItems: 'center', width: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 5 },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  timelineBody: { flex: 1, paddingBottom: spacing.lg, gap: 2 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadows.floating,
  },
  statusActions: { gap: spacing.sm },
  statusAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
});
