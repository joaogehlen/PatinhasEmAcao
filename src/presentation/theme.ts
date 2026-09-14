import type { TextStyle, ViewStyle } from 'react-native';

import type { AnimalStatus } from '@/domain/entities/Animal';
import type { UserRole } from '@/domain/entities/User';

import type { IconName } from './components/Icon';

export const colors = {
  primary: '#F26A3D',
  primaryDark: '#C9481D',
  primarySoft: '#FFE9DF',
  secondary: '#1FA398',
  secondaryDark: '#137A71',
  secondarySoft: '#DDF4F1',
  background: '#FFF9F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F1EB',
  border: '#EFE5DB',
  text: '#1D2433',
  textSoft: '#4A5263',
  textMuted: '#8A90A0',
  danger: '#E0473E',
  dangerSoft: '#FDE7E5',
  white: '#FFFFFF',
} as const;

export const gradients = {
  brand: ['#FF9A5C', '#F26A3D', '#E5532E'],
  night: ['#2A3350', '#1D2433'],
  photoTop: ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)'],
} as const;

export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;

export const shadows = {
  card: { boxShadow: '0px 6px 20px rgba(29, 36, 51, 0.08)' },
  floating: { boxShadow: '0px 12px 28px rgba(29, 36, 51, 0.18)' },
  primary: { boxShadow: '0px 10px 22px rgba(242, 106, 61, 0.35)' },
} satisfies Record<string, ViewStyle>;

export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 25 },
  subheading: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  overline: { fontFamily: fonts.extrabold, fontSize: 11, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

interface Tone {
  background: string;
  text: string;
  icon: IconName;
}

export const statusStyles: Record<AnimalStatus, Tone> = {
  denunciado: { background: '#FDE7E5', text: '#C2352B', icon: 'megaphone' },
  resgatado: { background: '#FFF1D6', text: '#A86A00', icon: 'volunteer' },
  em_tratamento: { background: '#E0EEFD', text: '#1F66B8', icon: 'health' },
  disponivel: { background: '#DDF5EA', text: '#17804F', icon: 'heart' },
  adotado: { background: '#EEE6FB', text: '#6D4AC2', icon: 'home' },
};

export const roleStyles: Record<UserRole, Tone & { description: string }> = {
  morador: {
    background: colors.primarySoft,
    text: colors.primaryDark,
    icon: 'home',
    description: 'Registra denúncias e acompanha os resgates.',
  },
  voluntario: {
    background: colors.secondarySoft,
    text: colors.secondaryDark,
    icon: 'volunteer',
    description: 'Atualiza resgates, tratamentos e o catálogo.',
  },
  admin: {
    background: '#EEE6FB',
    text: '#6D4AC2',
    icon: 'shield',
    description: 'Gerencia usuários, animais e a ONG.',
  },
};
