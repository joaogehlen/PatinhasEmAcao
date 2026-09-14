import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { USER_ROLE_LABELS } from '@/domain/entities/User';
import { AppText, Avatar, Button, Card, ListItem, Pill } from '@/presentation/components/ui';
import { formatDate } from '@/presentation/format';
import { useAuth, useCurrentUser } from '@/presentation/providers/AppProviders';
import { colors, radius, roleStyles, rules, spacing } from '@/presentation/theme';

const SOBRE =
  'Conectamos a comunidade de Arvorezinha/RS à ONG Patinhas em Ação para que nenhum animal em risco passe despercebido: da denúncia ao resgate, do tratamento à adoção.';

export default function ProfileScreen() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function confirmLogout() {
    Alert.alert('Sair da conta', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  /**
   * O convidado não está logado, então "sair" não descreve o que acontece —
   * e o que acontece é perder as denúncias, porque entrar em outra conta
   * abandona a sessão anônima deste aparelho. O aviso precisa dizer isso.
   */
  function confirmLeaveGuest() {
    Alert.alert(
      'Entrar em outra conta',
      'As denúncias que você registrou como convidado ficam só neste modo e você deixa de vê-las. Para levá-las junto, use "Criar conta".',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Entrar assim mesmo', style: 'destructive', onPress: () => void logout() },
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
        <AppText variant="body" color={colors.textSoft}>
          Dá para denunciar e acompanhar o que você mesmo registrou. Com uma conta, você vê todos os animais,
          acompanha os resgates e enxerga as vaquinhas abertas.
        </AppText>

        <View style={styles.guestWarning}>
          <AppText variant="caption" color={colors.textSoft}>
            Suas denúncias estão guardadas apenas neste aparelho. Se desinstalar o app ou limpar os dados, você
            perde o acesso a elas — criar uma conta leva tudo junto.
          </AppText>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button title="Criar conta" onPress={() => router.push('/sign-up')} />
          <Button title="Já tenho conta" variant="outline" onPress={confirmLeaveGuest} />
        </View>

        <ListItem
          icon="info"
          title="Sobre o Patinhas em Ação"
          subtitle="Nossa missão"
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
            subtitle="Nome e telefone"
            onPress={() => router.push('/profile/edit')}
          />
          <View style={styles.separator} />
          <ListItem
            icon="key"
            title="Alterar senha"
            subtitle="Mantenha sua conta segura"
            onPress={() => router.push('/profile/password')}
          />
          <View style={styles.separator} />
          <ListItem
            icon="info"
            title="Sobre o Patinhas em Ação"
            subtitle="Nossa missão"
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
  guestWarning: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: rules.hair,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
