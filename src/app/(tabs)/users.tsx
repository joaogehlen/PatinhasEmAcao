import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { USER_ROLE_LABELS, USER_ROLES, type User, type UserRole } from '@/domain/entities/User';
import { Icon } from '@/presentation/components/Icon';
import { AppText, Avatar, ChipSelect, EmptyState, FormError, IconButton, Pill, TextField } from '@/presentation/components/ui';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, radius, roleStyles, shadows, spacing } from '@/presentation/theme';

const ROLE_FILTER_LABELS: Record<UserRole, string> = { morador: 'Moradores', voluntario: 'Voluntários', admin: 'Admins' };

export default function UserListScreen() {
  const { users } = useServices();
  const actor = useCurrentUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [role, setRole] = useState<UserRole | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useCallback(
    () => users.list(actor, { role: role ?? undefined, search: debouncedSearch }),
    [users, actor, role, debouncedSearch],
  );
  const { data, error, loading, reload } = useFocusedQuery(query);

  const header = (
    <View>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color={colors.textMuted}>
            Administração
          </AppText>
          <AppText variant="title">Usuários</AppText>
        </View>
        <IconButton icon="add" variant="primary" size={48} accessibilityLabel="Novo usuário" onPress={() => router.push('/users/new')} />
      </View>
      <TextField icon="search" placeholder="Buscar por nome ou e-mail" value={search} onChangeText={setSearch} autoCapitalize="none" />
      <ChipSelect options={USER_ROLES} labels={ROLE_FILTER_LABELS} value={role} onChange={setRole} allLabel="Todos" scroll />
      <FormError message={error} />
      {data && (
        <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
          {data.length} {data.length === 1 ? 'pessoa' : 'pessoas'}
        </AppText>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={reload} tintColor={colors.primary} />}
      renderItem={({ item }) => <UserRow user={item} isSelf={item.id === actor.id} onPress={() => router.push(`/users/${item.id}`)} />}
      ListEmptyComponent={loading ? null : <EmptyState title="Ninguém encontrado" message="Ajuste a busca ou os filtros." />}
    />
  );
}

function UserRow({ user, isSelf, onPress }: { user: User; isSelf: boolean; onPress: () => void }) {
  const tone = roleStyles[user.role];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <Avatar name={user.name} size={48} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="subheading" numberOfLines={1}>
          {user.name}
          {isSelf ? ' (você)' : ''}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {user.email}
        </AppText>
        <Pill label={USER_ROLE_LABELS[user.role]} icon={tone.icon} background={tone.background} color={tone.text} />
      </View>
      <Icon name="chevronRight" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
});
