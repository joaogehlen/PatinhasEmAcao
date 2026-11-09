import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ADOCAO_STATUS_LABELS, HOUSING_LABELS, type AdocaoStatus } from '@/domain/entities/Adocao';
import { AdocaoCard, AdocaoStatusPill } from '@/presentation/components/AdocaoCard';
import { Icon } from '@/presentation/components/Icon';
import { AppText, Avatar, Card, FormError, SectionHeader, TextField } from '@/presentation/components/ui';
import { describeError, formatDateTime } from '@/presentation/format';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { useAuth, useCurrentUser, useServices } from '@/presentation/providers/AppProviders';
import { adocaoStyles, colors, radius, spacing } from '@/presentation/theme';

/**
 * Pedido de adoção. Quem pediu acompanha a situação; o admin vê o contato de
 * quem pediu e avança a avaliação. Aprovar não muda a situação do animal: a
 * adoção em si é registrada na página do animal.
 */
export default function AdocaoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { adocoes } = useServices();
  const actor = useCurrentUser();
  const { can } = useAuth();
  const router = useRouter();

  const query = useCallback(() => adocoes.getById(actor, id), [adocoes, actor, id]);
  const { data: adocao, error, loading, reload } = useFocusedQuery(query);
  const [note, setNote] = useState('');
  const [changing, setChanging] = useState(false);

  if (loading && !adocao) return <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />;
  if (!adocao) {
    return (
      <View style={{ padding: spacing.xl }}>
        <FormError message={error ?? 'Pedido não encontrado.'} />
      </View>
    );
  }

  const nextStatuses = adocoes.allowedNextStatuses(actor, adocao);
  const isReviewer = can('adocao:review');

  async function run(action: () => Promise<unknown>) {
    setChanging(true);
    try {
      await action();
      setNote('');
      await reload();
    } catch (err) {
      Alert.alert('Não foi possível alterar', describeError(err).message);
    } finally {
      setChanging(false);
    }
  }

  function confirmChange(next: AdocaoStatus) {
    const id = adocao!.id;
    if (next === 'aprovada') {
      // O caso comum é aprovar e entregar: um toque marca o animal como adotado
      // e recusa os outros pedidos abertos. "Só aprovar" fica para quando a
      // ONG ainda vai visitar a casa antes de entregar.
      Alert.alert('Aprovar pedido', 'O animal já vai para a nova família?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Só aprovar', onPress: () => void run(() => adocoes.changeStatus(actor, id, 'aprovada', note)) },
        { text: 'Aprovar e marcar adotado', onPress: () => void run(() => adocoes.approveAndAdopt(actor, id, note)) },
      ]);
      return;
    }
    Alert.alert(
      ADOCAO_STATUS_LABELS[next],
      `Marcar o pedido como ${ADOCAO_STATUS_LABELS[next].toLowerCase()}? Quem pediu recebe um aviso${note.trim() ? ' com a observação' : ''}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: next === 'recusada' ? 'destructive' : 'default',
          onPress: () => void run(() => adocoes.changeStatus(actor, id, next, note)),
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <FormError message={error} />

      <AdocaoCard adocao={adocao} onPress={() => router.push({ pathname: '/animals/[id]', params: { id: adocao.animalId } })} />

      <Card style={{ gap: spacing.sm }}>
        <SectionHeader title="Situação" icon="clock" />
        <AdocaoStatusPill status={adocao.status} />
        <AppText variant="caption" color={colors.textMuted}>
          Enviado em {formatDateTime(adocao.createdAt)}
          {adocao.reviewedAt ? ` · atualizado em ${formatDateTime(adocao.reviewedAt)}` : ''}
        </AppText>
        {adocao.reviewNote && (
          <AppText variant="body" color={colors.textSoft}>
            {adocao.reviewNote}
          </AppText>
        )}
      </Card>

      {isReviewer && (
        <Card style={{ gap: spacing.sm }}>
          <SectionHeader title="Quem pediu" icon="person" />
          <View style={styles.requester}>
            <Avatar name={adocao.requesterName ?? undefined} uri={adocao.requesterAvatar} size={44} />
            <AppText variant="subheading" style={{ flex: 1 }}>
              {adocao.requesterName ?? 'Conta excluída'}
            </AppText>
          </View>
          {adocao.requesterPhone && (
            <ContactRow icon="phone" label={adocao.requesterPhone} onPress={() => Linking.openURL(`tel:${adocao.requesterPhone}`)} />
          )}
          {adocao.requesterEmail && (
            <ContactRow icon="mail" label={adocao.requesterEmail} onPress={() => Linking.openURL(`mailto:${adocao.requesterEmail}`)} />
          )}
        </Card>
      )}

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Respostas" icon="list" />
        <Answer label="Moradia" value={HOUSING_LABELS[adocao.housing]} />
        <Answer label="Tem pátio" value={adocao.hasYard ? 'Sim' : 'Não'} />
        <Answer label="Crianças na casa" value={adocao.hasChildren ? 'Sim' : 'Não'} />
        <Answer label="Outros animais" value={adocao.otherAnimals ?? 'Nenhum'} />
        <Answer label="Experiência" value={adocao.experience ?? 'Não informada'} />
        <Answer label="Por que quer adotar" value={adocao.reason} />
      </Card>

      {nextStatuses.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Avaliar" icon="check" />
          <TextField
            label="Observação para quem pediu (opcional)"
            value={note}
            onChangeText={setNote}
            placeholder="Ex.: vamos ligar para combinar uma visita"
            maxLength={500}
            multiline
          />
          <View style={styles.actions}>
            {nextStatuses.map((next) => {
              const tone = adocaoStyles[next];
              return (
                <Pressable
                  key={next}
                  onPress={() => confirmChange(next)}
                  disabled={changing}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.action,
                    { borderColor: tone.text, backgroundColor: tone.background },
                    (pressed || changing) && { opacity: 0.6 },
                  ]}
                >
                  <Icon name={tone.icon} size={18} color={tone.text} />
                  <AppText variant="bodyStrong" color={tone.text}>
                    {next === 'em_analise' ? 'Iniciar análise' : next === 'aprovada' ? 'Aprovar' : 'Recusar'}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Answer({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="label" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

function ContactRow({ icon, label, onPress }: { icon: 'phone' | 'mail'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => [styles.contact, pressed && { opacity: 0.7 }]}>
      <Icon name={icon} size={18} color={colors.primary} />
      <AppText variant="bodyStrong" color={colors.primary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, paddingBottom: 56, gap: spacing.lg },
  requester: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
});
