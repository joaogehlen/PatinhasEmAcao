import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { USER_ROLE_LABELS } from '@/domain/entities/User';
import { keepGuestReports } from '@/infrastructure/pendingReports';
import { AppText, Avatar, Button, Card, ListItem, Pill } from '@/presentation/components/ui';
import { formatDate } from '@/presentation/format';
import { useAuth, useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { colors, radius, roleStyles, rules, spacing } from '@/presentation/theme';

const SOBRE =
  'Conectamos a comunidade de Arvorezinha/RS à ONG Patinhas em Ação para que nenhum animal em risco passe despercebido: da denúncia ao resgate, do tratamento à adoção.';

export default function ProfileScreen() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const { animals } = useServices();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function confirmLogout() {
    Alert.alert('Sair da conta', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  /**
   * Entrar em outra conta abandona a sessão anônima deste aparelho. As
   * denúncias dela ficam guardadas no aparelho, mas não passam para a conta —
   * o aviso diz isso, e só aparece se houver alguma. Como convidado, list()
   * devolve exatamente as dele (RLS) mais as da fila offline. A sessão só troca
   * quando o login der certo: voltar da tela de entrada mantém o convidado.
   */
  async function confirmLeaveGuest() {
    const mine = await animals.list().catch(() => []);
    if (mine.length === 0) return router.push('/sign-in');
    Alert.alert(
      'Entrar em outra conta',
      `Você registrou ${mine.length === 1 ? '1 denúncia' : `${mine.length} denúncias`} como convidado. Elas não passam para a outra conta.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Entrar assim mesmo',
          style: 'destructive',
          onPress: () => {
            keepGuestReports(mine);
            router.push('/sign-in');
          },
        },
      ],
    );
  }

  /**
   * O convidado não tem perfil para editar — tem um convite.
   *
   * Esta é a única tela onde ele encontra o motivo concreto de criar conta, e
   * o aviso de que a sessão dele mora no aparelho. Sem isso, ele perderia as
   * próprias denúncias sem nunca ter sido avisado.
   */
  if (user.isGuest) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.guestBody, { paddingTop: insets.top + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="title">Você está sem conta</AppText>

        <View style={styles.guestAvatar}>
          <Avatar size={140} />
        </View>

        {/* Some nas pontas para se misturar ao fundo. */}
        <LinearGradient
          colors={[`${colors.primary}00`, colors.primary, `${colors.primary}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.guestRule}
        />

        <View style={{ gap: spacing.sm }}>
          <Button title="Criar conta" onPress={() => router.push('/sign-up')} />
          <Button title="Já tenho conta" variant="outline" onPress={() => void confirmLeaveGuest()} />
        </View>

        <ListItem
          icon="info"
          title="Sobre o Patinhas em Ação"
          onPress={() => Alert.alert('Patinhas em Ação', SOBRE)}
        />
      </ScrollView>
    );
  }

  const tone = roleStyles[user.role];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.xxl }]}>
        <Avatar name={user.name} size={72} />
        <AppText variant="title">{user.name}</AppText>
        {user.email ? (
          <AppText variant="body" color={colors.textMuted}>
            {user.email}
          </AppText>
        ) : null}
        <Pill label={USER_ROLE_LABELS[user.role]} icon={tone.icon} background={tone.background} color={tone.text} />
      </View>

      <View style={styles.body}>
        <Card style={styles.menu}>
          <ListItem
            icon="person"
            title="Meus dados"
            onPress={() => router.push('/profile/edit')}
          />
          <View style={styles.separator} />
          <ListItem
            icon="key"
            title="Alterar senha"
            onPress={() => router.push('/profile/password')}
          />
          <View style={styles.separator} />
          <ListItem
            icon="info"
            title="Sobre o Patinhas em Ação"
            onPress={() => Alert.alert('Patinhas em Ação', SOBRE)}
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
  header: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  center: { textAlign: 'center' },
  body: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  menu: { padding: 0, paddingVertical: spacing.xs, borderRadius: radius.lg },
  separator: { height: rules.hair, backgroundColor: colors.border, marginLeft: 70 },

  guestBody: { padding: spacing.xl, gap: spacing.lg },
  guestAvatar: { alignItems: 'center', marginVertical: spacing.xl },
  guestRule: { height: 1, marginTop: -spacing.md, marginBottom: spacing.sm },
});
