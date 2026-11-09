import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STATUS_LABELS } from '@/domain/entities/Animal';
import { vaquinhaProgress } from '@/domain/entities/Vaquinha';
import { Icon } from '@/presentation/components/Icon';
import { PhotoViewer } from '@/presentation/components/PhotoViewer';
import { StatusBadge } from '@/presentation/components/StatusBadge';
import { AppText, Button, FormError, Pill, SectionHeader } from '@/presentation/components/ui';
import { describeError, formatDate, formatMoney } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useAuth, useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, gradients, radius, shadows, spacing, statusStyles } from '@/presentation/theme';

/** Página da notícia: texto, fotos e o cartão do animal ou da vaquinha vinculada. */
export default function NoticiaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { noticias, animals, vaquinhas } = useServices();
  const { can } = useAuth();
  const actor = useCurrentUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const heroHeight = Math.round(Math.min(window.height * 0.38, window.width * 0.75));
  const canManage = can('noticia:manage');

  const query = useCallback(async () => {
    const noticia = await noticias.getById(actor, id);
    // Vínculo excluído ou campanha encerrada (invisível ao morador): o cartão só some.
    const [animal, vaquinha] = await Promise.all([
      noticia.animalId ? animals.getById(noticia.animalId).catch(() => null) : null,
      noticia.vaquinhaId ? vaquinhas.getById(actor, noticia.vaquinhaId).catch(() => null) : null,
    ]);
    return { noticia, animal, vaquinha };
  }, [noticias, animals, vaquinhas, actor, id]);
  const { data, error, loading, reload } = useFocusedQuery(query);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [pinning, setPinning] = useState(false);

  if (loading && !data) return <ActivityIndicator style={{ marginTop: 120 }} color={colors.primary} />;
  if (!data) {
    return (
      <View style={{ padding: spacing.xl, paddingTop: insets.top + 60 }}>
        <FormError message={error ?? 'Notícia não encontrada.'} />
      </View>
    );
  }

  const { noticia, animal, vaquinha } = data;

  async function togglePinned() {
    setPinning(true);
    try {
      await noticias.setPinned(actor, noticia.id, !noticia.pinned);
      await reload();
    } catch (err) {
      Alert.alert('Não foi possível alterar', describeError(err).message);
    } finally {
      setPinning(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + (canManage ? 110 : 32) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          {noticia.coverUri ? (
            <Image source={{ uri: noticia.coverUri }} contentFit="cover" transition={300} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Icon name="news" size={56} color={colors.textMuted} />
            </View>
          )}
          <LinearGradient colors={gradients.photoTop} style={styles.heroShade} />
        </View>

        <View style={styles.sheet}>
          <FormError message={error} />
          <View style={{ gap: spacing.sm }}>
            <AppText variant="display" accessibilityRole="header">
              {noticia.title}
            </AppText>
            <View style={styles.metaRow}>
              {noticia.pinned && <Pill icon="pin" label="Fixada" background={colors.primarySoft} color={colors.primary} />}
              <AppText variant="caption" color={colors.textMuted}>
                {formatDate(noticia.createdAt)}
              </AppText>
            </View>
          </View>

          <AppText variant="body" color={colors.textSoft}>
            {noticia.body}
          </AppText>

          {noticia.photoUris.length > 0 && (
            <View>
              <SectionHeader title="Fotos" icon="gallery" subtitle={`${noticia.photoUris.length} foto(s)`} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                {noticia.photoUris.map((uri, index) => (
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
            <Pressable
              onPress={() => router.push({ pathname: '/animals/[id]', params: { id: animal.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${animal.name}, ${STATUS_LABELS[animal.status]}. Abrir página do animal`}
              style={({ pressed }) => [styles.linkCard, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.linkPhoto}>
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
          )}

          {vaquinha && (
            <Pressable
              onPress={() => router.push({ pathname: '/vaquinhas/[id]', params: { id: vaquinha.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Vaquinha ${vaquinha.title}. Abrir campanha`}
              style={({ pressed }) => [styles.linkCard, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.linkPhoto}>
                {vaquinha.coverUri ? (
                  <Image source={{ uri: vaquinha.coverUri }} contentFit="cover" style={StyleSheet.absoluteFill} />
                ) : (
                  <Icon name="donate" size={24} color={colors.textMuted} />
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="subheading" numberOfLines={1}>
                  {vaquinha.title}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {formatMoney(vaquinha.raisedCents)} de {formatMoney(vaquinha.goalCents)} ·{' '}
                  {Math.floor(vaquinhaProgress(vaquinha) * 100)}%
                </AppText>
              </View>
              <Icon name="chevronRight" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </ScrollView>

      {canManage && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            title={noticia.pinned ? 'Desafixar' : 'Fixar'}
            icon="pin"
            variant="outline"
            onPress={togglePinned}
            loading={pinning}
            style={{ flex: 1 }}
          />
          <Button
            title="Editar"
            icon="edit"
            onPress={() => router.push({ pathname: '/noticias/edit/[id]', params: { id: noticia.id } })}
            style={{ flex: 1 }}
          />
        </View>
      )}

      <PhotoViewer uris={noticia.photoUris} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { backgroundColor: colors.primarySoft },
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
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  galleryRow: { gap: spacing.sm },
  galleryThumb: { width: 132, height: 132, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  linkPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
});
