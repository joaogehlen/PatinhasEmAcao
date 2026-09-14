import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { USER_ROLE_LABELS } from '@/domain/entities/User';
import { PawPattern } from '@/presentation/components/Illustrations';
import { AppText, Avatar, Card, ListItem, Pill } from '@/presentation/components/ui';
import { formatDate } from '@/presentation/format';
import { useAuth, useCurrentUser } from '@/presentation/providers/AppProviders';
import { colors, gradients, radius, roleStyles, spacing } from '@/presentation/theme';

export default function ProfileScreen() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tone = roleStyles[user.role];

  function confirmLogout() {
    Alert.alert('Sair da conta', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xxl }} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.xl }]}
      >
        <PawPattern />
        <View style={styles.avatarRing}>
          <Avatar name={user.name} size={88} />
        </View>
        <AppText variant="title" color={colors.white} style={styles.center}>
          {user.name}
        </AppText>
        <AppText variant="bodyStrong" color="rgba(255,255,255,0.9)">
          {user.email}
        </AppText>
        <Pill label={USER_ROLE_LABELS[user.role]} icon={tone.icon} background={colors.surface} color={tone.text} />
      </LinearGradient>

      <View style={styles.body}>
        <Card style={styles.menu}>
          <ListItem icon="person" title="Meus dados" subtitle="Nome, e-mail e telefone" onPress={() => router.push('/profile/edit')} />
          <View style={styles.separator} />
          <ListItem icon="key" title="Alterar senha" subtitle="Mantenha sua conta segura" onPress={() => router.push('/profile/password')} />
          <View style={styles.separator} />
          <ListItem
            icon="info"
            title="Sobre o Patinhas em Ação"
            subtitle="Nossa missão"
            onPress={() =>
              Alert.alert(
                'Patinhas em Ação',
                'Conectamos moradores, voluntários e a ONG de Arvorezinha/RS para que nenhum animal em risco passe despercebido: da denúncia ao resgate, do tratamento à adoção.',
              )
            }
          />
        </Card>

        <Card style={styles.menu}>
          <ListItem icon="logout" title="Sair da conta" onPress={confirmLogout} danger />
        </Card>

        <AppText variant="caption" color={colors.textMuted} style={styles.center}>
          Membro desde {formatDate(user.createdAt)} · versão 1.0.0
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl + spacing.lg,
    overflow: 'hidden',
  },
  avatarRing: { padding: 4, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.35)', marginBottom: spacing.sm },
  center: { textAlign: 'center' },
  body: { padding: spacing.xl, marginTop: -spacing.xxl, gap: spacing.lg },
  menu: { padding: 0, paddingVertical: spacing.xs, borderRadius: radius.lg },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 70 },
});
