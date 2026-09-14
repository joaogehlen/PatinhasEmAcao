import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { StatusBadge } from '@/presentation/components/StatusBadge';
import { AppText, Avatar, ChipSelect, EmptyState, FormError, TextField } from '@/presentation/components/ui';
import { firstName, formatAge, greeting } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useAuth, useServices } from '@/presentation/providers/AppProviders';
import { colors, radius, rules, shadows, spacing, statusStyles } from '@/presentation/theme';

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
    const byStatus = {} as Record<AnimalStatus, number>;
    for (const value of ANIMAL_STATUSES) byStatus[value] = 0;
    for (const animal of all) byStatus[animal.status] += 1;
    return { filtered, byStatus, total: all.length };
  }, [animals, debouncedSearch, species, size, status]);
  const { data, error, loading, reload } = useFocusedQuery(query);

  /** Filtros que vivem dentro do painel, e por isso precisam de aviso no botão. */
  const panelFilters = (species ? 1 : 0) + (size ? 1 : 0);

  /**
   * A contagem por situação é o próprio filtro.
   *
   * Antes havia um cartão de impacto com números grandes acima de uma lista de
   * filtros que repetia as mesmas categorias. Número que só se olha é enfeite;
   * aqui ele é o controle, e a informação some da tela só quando some do banco.
   */
  const statusLabels = useMemo(() => {
    const labels = {} as Record<AnimalStatus, string>;
    for (const value of ANIMAL_STATUSES) {
      const count = data?.byStatus[value];
      labels[value] = count === undefined ? STATUS_LABELS[value] : `${STATUS_LABELS[value]} · ${count}`;
    }
    return labels;
  }, [data]);

  const header = (
    <View>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="body" color={colors.textMuted}>
            {greeting()}
            {user ? `, ${firstName(user.name)}` : ''}
          </AppText>
          <AppText variant="title">Quem precisa de você hoje?</AppText>
        </View>
        {user && (
          <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Abrir perfil">
            <Avatar name={user.name} size={46} />
          </Pressable>
        )}
      </View>

      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <TextField
            icon="search"
            placeholder="Buscar por nome ou descrição"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
        <Pressable
          onPress={() => setShowFilters((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={panelFilters > 0 ? `Filtros, ${panelFilters} ativos` : 'Mais filtros'}
          accessibilityState={{ expanded: showFilters }}
          style={[styles.filterButton, (showFilters || panelFilters > 0) && styles.filterButtonActive]}
        >
          <Icon name="filter" size={20} color={showFilters || panelFilters > 0 ? colors.onPrimary : colors.textSoft} />
          {panelFilters > 0 && !showFilters && (
            <View style={styles.filterBadge}>
              <AppText variant="label" color={colors.onPrimary} style={styles.filterBadgeText}>
                {panelFilters}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      {/*
        Só o status fica sempre à vista. É por ele que se navega o catálogo —
        quem procura adotar quer "disponível", quem acompanha quer ver o que
        está em tratamento. Espécie e porte são refinamento, e moram no painel.
      */}
      <View style={styles.statusRow}>
        <ChipSelect
          options={ANIMAL_STATUSES}
          labels={statusLabels}
          value={status}
          onChange={setStatus}
          allLabel={data ? `Tudo · ${data.total}` : 'Tudo'}
          scroll
        />
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <ChipSelect
            label="Espécie"
            options={ANIMAL_SPECIES}
            labels={SPECIES_FILTER_LABELS}
            value={species}
            onChange={setSpecies}
            allowClear
          />
          <ChipSelect label="Porte" options={ANIMAL_SIZES} labels={SIZE_LABELS} value={size} onChange={setSize} allowClear />
        </View>
      )}

      <View style={styles.listTitle}>
        <AppText variant="heading">{data ? `${data.filtered.length} animais` : 'Animais'}</AppText>
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
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && data !== null}
            onRefresh={reload}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        renderItem={({ item }) => (
          <AnimalCard animal={item} width={cardWidth} onPress={() => router.push(`/animals/${item.id}`)} />
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title="Nenhum animal por aqui"
              message="Tente outros filtros, ou registre um animal que precisa de ajuda."
            />
          )
        }
      />

      {/*
        Denunciar é a ação mais importante do produto e acontece na rua, com
        pressa. Por isso ela flutua acima da lista em vez de rolar junto com
        ela: nunca fica fora de alcance.
      */}
      {can('animal:create') && (
        <Pressable
          onPress={() => router.push('/animals/new')}
          accessibilityRole="button"
          accessibilityLabel="Registrar denúncia de animal"
          style={({ pressed }) => [
            styles.fab,
            { bottom: insets.bottom + spacing.lg },
            pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Icon name="megaphone" size={20} color={colors.onPrimary} />
          <AppText variant="button" color={colors.onPrimary}>
            Denunciar
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

function AnimalCard({ animal, width, onPress }: { animal: Animal; width: number; onPress: () => void }) {
  const tone = statusStyles[animal.status];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${animal.name}, ${STATUS_LABELS[animal.status]}`}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.cardPressed]}
    >
      <View style={[styles.cardImage, { height: width * 1.05 }]}>
        {animal.photoUri ? (
          <Image source={{ uri: animal.photoUri }} contentFit="cover" transition={220} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.cardPlaceholder}>
            <Icon name={tone.icon} size={26} color={colors.textMuted} />
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
  list: { paddingHorizontal: SCREEN_PADDING, gap: GRID_GAP },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },

  searchRow: { flexDirection: 'row', gap: spacing.sm },
  filterButton: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: rules.hair,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 11, lineHeight: 14 },

  statusRow: { marginTop: spacing.xs },
  filtersPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: rules.hair,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: 0,
    marginBottom: spacing.lg,
  },

  listTitle: { marginTop: spacing.sm, marginBottom: spacing.md },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: rules.hair,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  cardImage: { backgroundColor: colors.surfaceAlt },
  cardPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  cardBody: { padding: spacing.md, gap: 2 },

  fab: {
    position: 'absolute',
    right: SCREEN_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
});
