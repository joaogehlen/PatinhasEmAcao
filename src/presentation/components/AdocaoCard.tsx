import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ADOCAO_STATUS_LABELS, type Adocao } from '@/domain/entities/Adocao';

import { formatDate } from '../format';
import { adocaoStyles, colors, radius, shadows, spacing } from '../theme';
import { Icon } from './Icon';
import { AppText, Avatar, Pill } from './ui';

/** Pill do status do pedido de adoção. */
export function AdocaoStatusPill({ status }: { status: Adocao['status'] }) {
  const tone = adocaoStyles[status];
  return <Pill icon={tone.icon} label={ADOCAO_STATUS_LABELS[status]} background={tone.background} color={tone.text} />;
}

/**
 * Pedido de adoção numa lista. Na fila do admin mostra quem pediu; em "Meus
 * pedidos", o animal.
 */
export function AdocaoCard({ adocao, showRequester, onPress }: { adocao: Adocao; showRequester?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Pedido de adoção de ${adocao.animalName ?? 'animal'}, ${ADOCAO_STATUS_LABELS[adocao.status]}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.photo}>
        {adocao.animalPhoto ? (
          <Image source={{ uri: adocao.animalPhoto }} contentFit="cover" style={StyleSheet.absoluteFill} />
        ) : (
          <Icon name="paw" size={24} color={colors.textMuted} />
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="subheading" numberOfLines={1}>
          {adocao.animalName ?? 'Animal removido'}
        </AppText>
        {showRequester && (
          <View style={styles.requester}>
            <Avatar name={adocao.requesterName ?? undefined} uri={adocao.requesterAvatar} size={20} />
            <AppText variant="caption" color={colors.textSoft} numberOfLines={1} style={{ flex: 1 }}>
              {adocao.requesterName ?? 'Conta excluída'}
            </AppText>
          </View>
        )}
        <View style={styles.meta}>
          <AdocaoStatusPill status={adocao.status} />
          <AppText variant="caption" color={colors.textMuted}>
            {formatDate(adocao.createdAt)}
          </AppText>
        </View>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requester: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
});
