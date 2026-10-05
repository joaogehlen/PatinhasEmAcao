import { STATUS_LABELS, type AnimalStatus } from '@/domain/entities/Animal';

import { colors, statusStyles } from '../theme';
import { Pill } from './ui';

/** `pending`: denúncia salva no aparelho, ainda não enviada. Substitui o status, que ninguém viu ainda. */
export function StatusBadge({ status, pending = false }: { status: AnimalStatus; pending?: boolean }) {
  if (pending) return <Pill label="Pendente" icon="clock" background={colors.surfaceAlt} color={colors.textSoft} />;
  const tone = statusStyles[status];
  return <Pill label={STATUS_LABELS[status]} icon={tone.icon} background={tone.background} color={tone.text} />;
}
