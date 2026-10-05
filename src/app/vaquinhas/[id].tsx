import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STATUS_LABELS } from '@/domain/entities/Animal';
import { vaquinhaProgress, vaquinhaRemaining, type Vaquinha, type VaquinhaEntrada } from '@/domain/entities/Vaquinha';
import { Icon } from '@/presentation/components/Icon';
import { StatusBadge } from '@/presentation/components/StatusBadge';
import { AppText, Button, Card, FormError, IconButton, Pill, SectionHeader, TextField } from '@/presentation/components/ui';
import { describeError, formatDate, formatDateTime, formatMoney, parseMoney } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useKeyboardVisible } from '@/presentation/hooks/useKeyboardVisible';
import { useAuth, useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, gradients, radius, rules, shadows, spacing, statusStyles } from '@/presentation/theme';

/**
 * Página da campanha.
 *
 * Para o morador: o que é, quanto falta, fotos e a chave PIX. Para o admin,
 * além disso: lançar os valores recebidos (a barra anda a cada lançamento),
 * corrigir lançamento errado, encerrar ou reabrir e editar.
 */
export default function VaquinhaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vaquinhas, animals } = useServices();
  const { can } = useAuth();
  const actor = useCurrentUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const canManage = can('vaquinha:manage');

  const query = useCallback(async () => {
    const [vaquinha, entradas] = await Promise.all([vaquinhas.getById(actor, id), vaquinhas.entradas(actor, id)]);
    // Animal excluído depois de vinculado: a campanha continua, sem o cartão.
    const animal = vaquinha.animalId ? await animals.getById(vaquinha.animalId).catch(() => null) : null;
    return { vaquinha, entradas, animal };
  }, [vaquinhas, animals, actor, id]);
  const { data, error, loading, reload } = useFocusedQuery(query);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [toggling, setToggling] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const keyboardVisible = useKeyboardVisible();

  if (loading && !data) {
    return <ActivityIndicator style={{ marginTop: 120 }} color={colors.primary} />;
  }
  if (!data) {
    return (
      <View style={{ padding: spacing.xl, paddingTop: insets.top + 60 }}>
        <FormError message={error ?? 'Vaquinha não encontrada.'} />
      </View>
    );
  }

  const { vaquinha, entradas, animal } = data;
  const progress = vaquinhaProgress(vaquinha);
  const remaining = vaquinhaRemaining(vaquinha);

  async function copyPix() {
    if (!vaquinha.pixKey) return;
    await Clipboard.setStringAsync(vaquinha.pixKey);
    Alert.alert('Chave copiada', 'Cole no aplicativo do seu banco para fazer a doação.');
  }

  function confirmToggleActive() {
    const closing = vaquinha.active;
    Alert.alert(
      closing ? 'Encerrar campanha' : 'Reabrir campanha',
      closing
        ? 'A vaquinha some para os moradores e para de receber lançamentos. Dá para reabrir depois.'
        : 'A vaquinha volta a aparecer para os moradores.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: closing ? 'Encerrar' : 'Reabrir',
          style: closing ? 'destructive' : 'default',
          onPress: async () => {
            setToggling(true);
            try {
              await vaquinhas.setActive(actor, vaquinha.id, !closing);
              await reload();
            } catch (err) {
              Alert.alert('Não foi possível alterar', describeError(err).message);
            } finally {
              setToggling(false);
            }
          },
        },
      ],
    );
  }

  function confirmRemoveEntrada(entrada: VaquinhaEntrada) {
    Alert.alert(
      'Remover lançamento',
      `Remover ${formatMoney(entrada.amountCents)} de ${formatDate(entrada.createdAt)}? O total da vaquinha é recalculado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(entrada.id);
            try {
              await vaquinhas.removeEntrada(actor, vaquinha.id, entrada.id);
              await reload();
            } catch (err) {
              Alert.alert('Não foi possível remover', describeError(err).message);
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + (canManage ? 110 : 32) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={reload}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <View style={styles.hero}>
          {vaquinha.coverUri ? (
            <Image source={{ uri: vaquinha.coverUri }} contentFit="cover" transition={300} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Icon name="donate" size={56} color={colors.textMuted} />
            </View>
          )}
          <LinearGradient colors={gradients.photoTop} style={styles.heroShade} />
        </View>

        <View style={styles.sheet}>
          {/* Recarga que falhou (sem rede, campanha encerrada para o morador):
              os dados abaixo podem estar desatualizados, e a pessoa precisa saber. */}
          <FormError message={error} />
          <View style={{ gap: spacing.sm }}>
            <AppText variant="display" accessibilityRole="header">
              {vaquinha.title}
            </AppText>
            <View style={styles.metaRow}>
              {vaquinha.active ? (
                <Pill icon="heart" label="Aberta" background={colors.primarySoft} color={colors.primary} />
              ) : (
                <Pill icon="clock" label="Encerrada" background={colors.surfaceAlt} color={colors.textSoft} />
              )}
              <AppText variant="caption" color={colors.textMuted}>
                desde {formatDate(vaquinha.createdAt)}
              </AppText>
            </View>
          </View>

          <ProgressCard vaquinha={vaquinha} progress={progress} remaining={remaining} />

          {vaquinha.pixKey ? (
            <Pressable
              onPress={copyPix}
              accessibilityRole="button"
              accessibilityLabel="Copiar chave PIX"
              style={({ pressed }) => [styles.pixCard, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.pixIcon}>
                <Icon name="copy" size={20} color={colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" color={colors.textMuted}>
                  Chave PIX · toque para copiar
                </AppText>
                <AppText variant="record" numberOfLines={1}>
                  {vaquinha.pixKey}
                </AppText>
              </View>
            </Pressable>
          ) : (
            <AppText variant="caption" color={colors.textMuted}>
              A ONG ainda não informou a chave PIX desta campanha.
            </AppText>
          )}

          <View>
            <SectionHeader title="Sobre" icon="info" />
            <AppText variant="body" color={colors.textSoft}>
              {vaquinha.description}
            </AppText>
            {!!vaquinha.details && (
              <AppText variant="body" color={colors.textSoft} style={{ marginTop: spacing.md }}>
                {vaquinha.details}
              </AppText>
            )}
          </View>

          {vaquinha.photoUris.length > 0 && (
            <View>
              <SectionHeader title="Fotos" icon="gallery" subtitle={`${vaquinha.photoUris.length} foto(s)`} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                {vaquinha.photoUris.map((uri, index) => (
                  <Pressable
                    key={uri}
                    onPress={() => setViewerIndex(index)}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={`Ampliar foto ${index + 1}`}
                    style={styles.galleryThumb}
                  >
                    <Image source={{ uri }} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {animal && (
            <View>
              <SectionHeader title="Animal da campanha" icon="paw" />
              <Pressable
                onPress={() => router.push({ pathname: '/animals/[id]', params: { id: animal.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${animal.name}, ${STATUS_LABELS[animal.status]}. Abrir página do animal`}
                style={({ pressed }) => [styles.animalCard, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.animalPhoto}>
                  {animal.photoUri ? (
                    <Image source={{ uri: animal.photoUri }} contentFit="cover" style={StyleSheet.absoluteFill} />
                  ) : (
                    <Icon name={statusStyles[animal.status].icon} size={24} color={colors.textMuted} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="subheading">{animal.name}</AppText>
                  <StatusBadge status={animal.status} />
                </View>
                <Icon name="chevronRight" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          )}

          <View style={{ gap: spacing.md }}>
            <SectionHeader
              title="Arrecadação"
              icon="clock"
              subtitle={entradas.length > 0 ? `${entradas.length} lançamento(s)` : 'Valores informados pela ONG'}
            />

            {canManage && vaquinha.active && <EntradaForm vaquinhaId={vaquinha.id} onSaved={reload} />}

            {entradas.length === 0 ? (
              <AppText variant="body" color={colors.textMuted}>
                Nenhum valor lançado ainda.
              </AppText>
            ) : (
              <Card>
                {entradas.map((entrada, index) => (
                  <View
                    key={entrada.id}
                    style={[styles.entrada, index > 0 && styles.entradaDivider, removingId === entrada.id && { opacity: 0.4 }]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodyStrong" color={colors.primary}>
                        + {formatMoney(entrada.amountCents)}
                      </AppText>
                      {!!entrada.note && (
                        <AppText variant="body" color={colors.textSoft}>
                          {entrada.note}
                        </AppText>
                      )}
                      <AppText variant="caption" color={colors.textMuted}>
                        {formatDateTime(entrada.createdAt)}
                      </AppText>
                    </View>
                    {/* Campanha encerrada tem total final: nem soma, nem corrige. */}
                    {canManage && vaquinha.active && (
                      <Pressable
                        onPress={() => confirmRemoveEntrada(entrada)}
                        disabled={removingId !== null}
                        accessibilityRole="button"
                        accessibilityLabel={`Remover lançamento de ${formatMoney(entrada.amountCents)}`}
                        style={({ pressed }) => [styles.entradaRemove, pressed && { backgroundColor: colors.surfaceAlt }]}
                      >
                        <Icon name="trash" size={18} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </Card>
            )}

            <AppText variant="caption" color={colors.textMuted}>
              O app não recebe nem confirma doações: os valores são lançados pela ONG.
            </AppText>
          </View>
        </View>
      </ScrollView>

      {canManage && !keyboardVisible && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            title={vaquinha.active ? 'Encerrar' : 'Reabrir'}
            icon={vaquinha.active ? 'close' : 'check'}
            variant="outline"
            onPress={confirmToggleActive}
            loading={toggling}
            style={{ flex: 1 }}
          />
          <Button
            title="Editar"
            icon="edit"
            onPress={() => router.push({ pathname: '/vaquinhas/edit/[id]', params: { id: vaquinha.id } })}
            style={{ flex: 1 }}
          />
        </View>
      )}

      <PhotoViewer uris={vaquinha.photoUris} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </View>
  );
}

function ProgressCard({ vaquinha, progress, remaining }: { vaquinha: Vaquinha; progress: number; remaining: number }) {
  const percent = Math.floor(progress * 100);
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.progressHead}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={colors.textMuted}>
            Arrecadado
          </AppText>
          <AppText variant="display" color={colors.primary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {formatMoney(vaquinha.raisedCents)}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            de {formatMoney(vaquinha.goalCents)}
          </AppText>
        </View>
        <AppText variant="title" color={colors.text}>
          {percent}%
        </AppText>
      </View>
      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityLabel="Progresso da meta"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
      >
        <View style={[styles.progressFill, !vaquinha.active && styles.progressFillClosed, { width: `${progress * 100}%` }]} />
      </View>
      <AppText variant="bodyStrong" color={remaining === 0 ? colors.primary : colors.textSoft}>
        {remaining === 0 ? 'Meta atingida. Obrigado a quem ajudou!' : `Faltam ${formatMoney(remaining)} para a meta`}
      </AppText>
    </Card>
  );
}

/** Lançamento de valor recebido: é o que faz a barra andar. */
function EntradaForm({ vaquinhaId, onSaved }: { vaquinhaId: string; onSaved: () => Promise<void> }) {
  const { vaquinhas } = useServices();
  const actor = useCurrentUser();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function confirmSave() {
    const cents = parseMoney(amount);
    // Valor ilegível ou zero: o serviço devolve o erro de campo.
    if (cents === null || cents <= 0) return void save(cents);
    Alert.alert('Lançar valor', `Somar ${formatMoney(cents)} ao arrecadado desta vaquinha?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Lançar', onPress: () => void save(cents) },
    ]);
  }

  async function save(amountCents: number | null) {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await vaquinhas.addEntrada(actor, vaquinhaId, { amountCents, note });
      setAmount('');
      setNote('');
      await onSaved();
    } catch (err) {
      const described = describeError(err);
      setError(Object.keys(described.fieldErrors).length > 0 ? null : described.message);
      setFieldErrors(described.fieldErrors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.entradaForm}>
      <AppText variant="subheading">Lançar valor recebido</AppText>
      <FormError message={error} />
      <TextField
        label="Valor (R$)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="50,00"
        error={fieldErrors.amountCents}
      />
      <TextField
        label="Observação (opcional)"
        value={note}
        onChangeText={setNote}
        placeholder="Doações do bazar, PIX da semana…"
        maxLength={200}
        error={fieldErrors.note}
      />
      <Button title="Lançar" icon="add" onPress={confirmSave} loading={saving} />
    </Card>
  );
}

/** Foto em tela cheia, deslizando entre as da galeria. */
function PhotoViewer({ uris, index, onClose }: { uris: string[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Mantém a última foto montada durante o fade de saída, em vez de piscar preto.
  const [shown, setShown] = useState(index ?? 0);
  const [current, setCurrent] = useState(index ?? 0);
  if (index !== null && index !== shown) {
    setShown(index);
    setCurrent(index);
  }

  return (
    <Modal visible={index !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.viewer}>
        {uris.length > 0 && (
          <FlatList
            key={shown}
            data={uris}
            keyExtractor={(uri) => uri}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(shown, uris.length - 1)}
            onMomentumScrollEnd={(event) => setCurrent(Math.round(event.nativeEvent.contentOffset.x / width))}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} contentFit="contain" style={{ width, height }} />
            )}
          />
        )}
        {uris.length > 1 && (
          <View style={[styles.viewerCounter, { top: insets.top + spacing.md + 12 }]}>
            <AppText variant="label" color={colors.white}>
              {current + 1}/{uris.length}
            </AppText>
          </View>
        )}
        <View style={[styles.viewerClose, { top: insets.top + spacing.md }]}>
          <IconButton icon="close" variant="glass" accessibilityLabel="Fechar foto" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { height: 300, backgroundColor: colors.primarySoft },
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

  progressHead: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  progressTrack: { height: 12, borderRadius: 6, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: colors.primary },
  progressFillClosed: { backgroundColor: colors.secondaryDark },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },

  pixCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: rules.base,
    borderColor: colors.primary,
    padding: spacing.lg,
  },
  pixIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  galleryRow: { gap: spacing.sm },
  galleryThumb: {
    width: 132,
    height: 132,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },

  animalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  animalPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  entradaForm: { gap: spacing.sm },
  entrada: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  entradaRemove: {
    width: 44,
    height: 44,
    marginTop: -10,
    marginRight: -10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entradaDivider: { borderTopWidth: rules.hair, borderTopColor: colors.border },

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

  viewer: { flex: 1, backgroundColor: '#000' },
  viewerClose: { position: 'absolute', right: spacing.lg },
  viewerCounter: { position: 'absolute', left: spacing.lg },
});
