import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ANIMAL_SIZES,
  ANIMAL_SPECIES,
  ANIMAL_STATUSES,
  SIZE_LABELS,
  STATUS_LABELS,
  type Animal,
  type AnimalSize,
  type AnimalSpecies,
  type AnimalStatus,
} from '@/domain/entities/Animal';
import { Icon } from '@/presentation/components/Icon';
import { PawPattern, PawPrint } from '@/presentation/components/Illustrations';
import { StatusBadge } from '@/presentation/components/StatusBadge';
import { AppText, Avatar, ChipSelect, EmptyState, FormError, TextField } from '@/presentation/components/ui';
import { firstName, formatAge, greeting } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useAuth, useServices } from '@/presentation/providers/AppProviders';
import { colors, gradients, radius, shadows, spacing } from '@/presentation/theme';

const SPECIES_FILTER_LABELS: Record<AnimalSpecies, string> = { cachorro: 'Cachorros', gato: 'Gatos', outro: 'Outros' };
const GRID_GAP = spacing.md;
const SCREEN_PADDING = spacing.xl;

export default function HomeScreen() {
  const { animals } = useServices();
  const { user, can } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = (width - SCREEN_PADDING * 2 - GRID_GAP) / 2;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [species, setSpecies] = useState<AnimalSpecies | null>(null);
  const [size, setSize] = useState<AnimalSize | null>(null);
  const [status, setStatus] = useState<AnimalStatus | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useCallback(async () => {
    const [filtered, all] = await Promise.all([
      animals.list({
        search: debouncedSearch,
        species: species ?? undefined,
        size: size ?? undefined,
        status: status ?? undefined,
      }),
      animals.list(),
    ]);
    const count = (...statuses: AnimalStatus[]) => all.filter((animal) => statuses.includes(animal.status)).length;
    return {
      filtered,
      stats: {
        available: count('disponivel'),
        inCare: count('resgatado', 'em_tratamento'),
        adopted: count('adotado'),
      },
    };
  }, [animals, debouncedSearch, species, size, status]);
  const { data, error, loading, reload } = useFocusedQuery(query);

  const activeFilters = (size ? 1 : 0) + (status ? 1 : 0);

  const header = (
    <View>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" color={colors.textMuted}>
            {greeting()}, {user ? firstName(user.name) : ''} 👋
          </AppText>
          <AppText variant="title">Quem precisa de você hoje?</AppText>
        </View>
        {user && (
          <Pressable onPress={() => router.push('/profile')} accessibilityLabel="Abrir perfil">
            <Avatar name={user.name} size={48} />
          </Pressable>
        )}
      </View>

      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.impactCard}>
        <PawPattern opacity={0.12} />
        <AppText variant="overline" color="rgba(255,255,255,0.85)">
          Impacto da ONG
        </AppText>
        <View style={styles.statsRow}>
          <Stat value={data?.stats.available} label="para adoção" />
          <View style={styles.statDivider} />
          <Stat value={data?.stats.inCare} label="em cuidado" />
          <View style={styles.statDivider} />
          <Stat value={data?.stats.adopted} label="adotados" />
        </View>
      </LinearGradient>

      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <TextField icon="search" placeholder="Buscar por nome ou descrição" value={search} onChangeText={setSearch} returnKeyType="search" />
        </View>
        <Pressable
          onPress={() => setShowFilters((value) => !value)}
          accessibilityLabel="Filtros"
          style={[styles.filterButton, (showFilters || activeFilters > 0) && styles.filterButtonActive]}
        >
          <Icon name="filter" size={20} color={showFilters || activeFilters > 0 ? colors.white : colors.text} />
          {activeFilters > 0 && (
            <View style={styles.filterBadge}>
              <AppText variant="label" color={colors.white} style={{ fontSize: 10, lineHeight: 12 }}>
                {activeFilters}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      <ChipSelect
        options={ANIMAL_SPECIES}
        labels={SPECIES_FILTER_LABELS}
        value={species}
        onChange={setSpecies}
        allLabel="Todos"
        icons={{ cachorro: 'paw', gato: 'paw' }}
        scroll
      />

      {showFilters && (
        <View style={styles.filtersPanel}>
          <ChipSelect label="Porte" options={ANIMAL_SIZES} labels={SIZE_LABELS} value={size} onChange={setSize} allowClear />
          <ChipSelect label="Situação" options={ANIMAL_STATUSES} labels={STATUS_LABELS} value={status} onChange={setStatus} allowClear />
        </View>
      )}

      {can('animal:create') && (
        <Pressable onPress={() => router.push('/animals/new')} style={({ pressed }) => [styles.reportBanner, pressed && { opacity: 0.9 }]}>
          <View style={styles.reportIcon}>
            <Icon name="megaphone" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subheading" color={colors.white}>
              Viu um animal em risco?
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">
              Registre uma denúncia com foto em menos de 1 minuto.
            </AppText>
          </View>
          <Icon name="chevronRight" size={18} color={colors.white} />
        </Pressable>
      )}

      <View style={styles.listTitle}>
        <AppText variant="heading">Animais</AppText>
        <AppText variant="label" color={colors.textMuted}>
          {data ? `${data.filtered.length} encontrados` : ''}
        </AppText>
      </View>
      <FormError message={error} />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data?.filtered ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GRID_GAP }}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={reload} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <AnimalCard animal={item} width={cardWidth} onPress={() => router.push(`/animals/${item.id}`)} />
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title="Nenhum animal por aqui"
              message="Tente outros filtros ou registre um animal que precisa de ajuda."
            />
          )
        }
      />
    </View>
  );
}

function Stat({ value, label }: { value: number | undefined; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="display" color={colors.white}>
        {value ?? '–'}
      </AppText>
      <AppText variant="caption" color="rgba(255,255,255,0.9)">
        {label}
      </AppText>
    </View>
  );
}

function AnimalCard({ animal, width, onPress }: { animal: Animal; width: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { width }, pressed && styles.cardPressed]}>
      <View style={[styles.cardImage, { height: width * 1.1 }]}>
        {animal.photoUri ? (
          <Image source={{ uri: animal.photoUri }} contentFit="cover" transition={250} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.cardPlaceholder}>
            <PawPrint size={48} color={colors.primary} opacity={0.5} />
          </View>
        )}
        <View style={styles.cardBadge}>
          <StatusBadge status={animal.status} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <AppText variant="subheading" numberOfLines={1}>
          {animal.name}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {SIZE_LABELS[animal.size]} · {formatAge(animal.ageMonths)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxl, gap: GRID_GAP },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  impactCard: { borderRadius: radius.lg, padding: spacing.xl, overflow: 'hidden', marginBottom: spacing.xl, ...shadows.primary },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)' },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  filterButton: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: { backgroundColor: colors.text, borderColor: colors.text },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersPanel: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, paddingBottom: 0, marginBottom: spacing.lg, ...shadows.card },
  reportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadows.card },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  cardImage: { backgroundColor: colors.primarySoft },
  cardPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm },
  cardBody: { padding: spacing.md, gap: 2 },
});
