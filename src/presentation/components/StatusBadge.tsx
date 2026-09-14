import { STATUS_LABELS, type AnimalStatus } from '@/domain/entities/Animal';

import { statusStyles } from '../theme';
import { Pill } from './ui';

export function StatusBadge({ status }: { status: AnimalStatus }) {
  const tone = statusStyles[status];
  return <Pill label={STATUS_LABELS[status]} icon={tone.icon} background={tone.background} color={tone.text} />;
}
