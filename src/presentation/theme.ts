import type { TextStyle, ViewStyle } from 'react-native';

import type { AnimalStatus } from '@/domain/entities/Animal';
import type { UserRole } from '@/domain/entities/User';

import type { IconName } from './components/Icon';

/**
 * Mundo visual: escuro e quente, laranja maciço no centro.
 *
 * Direção fixada pelo usuário. O fundo não é cinza-azulado neutro: é um
 * escuro de café, quente, que o laranja habita sem brigar. O laranja é a cor
 * central e aparece em cheio — botão, ação flutuante, chip ativo, foco — não
 * como fiozinho de acento. O bege é o contrapeso calmo: ele carrega o texto e
 * as superfícies grandes, e é o que impede o laranja de virar alarme.
 *
 * Animado pelo laranja em área cheia; confiante pelo bege e pela ausência de
 * brilho. A armadilha desta estética é halo colorido em volta dos elementos —
 * aqui a profundidade vem de claridade de superfície, nunca de brilho.
 *
 * Contraste conferido contra o fundo #16100E: texto secundário 5.2:1,
 * laranja 7.1:1, bege 12.4:1, todas as cores de status acima de 4.5:1.
 */

export const colors = {
  /** Laranja: a cor central. Ação primária, foco, estado ativo, em área cheia. */
  primary: '#FF7A45',
  /** Texto sobre o laranja. Branco sobre laranja reprova contraste; tinta escura passa. */
  onPrimary: '#1A0E08',
  primaryDark: '#E2602E',
  /** Laranja rebaixado para preencher superfície, não para texto. */
  primarySoft: '#3A2118',

  /** Bege: o contrapeso calmo. Texto de destaque e superfícies que precisam parar. */
  secondary: '#E8D5BE',
  secondaryDark: '#C9B294',
  secondarySoft: '#2E2620',

  /** Escuro de café, não preto: preto absoluto achata a elevação e esfria o laranja. */
  background: '#16100E',
  /** Cartão e folha elevada. */
  surface: '#201815',
  /** Campo de entrada e superfície sobre o cartão. */
  surfaceAlt: '#2B211C',
  border: '#382C26',
  borderStrong: '#4D3C34',

  text: '#F7EDE4',
  textSoft: '#CDB9A9',
  textMuted: '#9C8878',
  /**
   * Texto de placeholder. Mais claro que textMuted de propósito: ele vive
   * sobre surfaceAlt, não sobre o fundo, e ali o muted cairia abaixo do piso.
   * Sobre #2B211C este tom dá 5.6:1.
   */
  placeholder: '#B09C8C',

  danger: '#FF6B6B',
  dangerSoft: '#331917',
  white: '#FFFFFF',
} as const;

/**
 * Véu sobre foto e clareamento sutil do topo da tela. Sem gradiente
 * decorativo e sem texto em gradiente.
 */
export const gradients = {
  brand: ['#2B211C', '#16100E'],
  night: ['#201815', '#16100E'],
  photoTop: ['rgba(14,9,7,0)', 'rgba(14,9,7,0.94)'],
} as const;

export const fonts = {
  regular: 'Archivo_400Regular',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extrabold: 'Archivo_800ExtraBold',
  /** Só para dado realmente tabular: data, código, medida. */
  mono: 'ChivoMono_400Regular',
  monoBold: 'ChivoMono_700Bold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Raios generosos: é o que separa uma superfície contemporânea de uma caixa de formulário. */
export const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 } as const;

export const rules = { hair: 1, base: 1.5, strong: 2.5 } as const;

/**
 * No escuro, sombra quase não lê — quem carrega elevação é a claridade da
 * superfície. Estas existem para separar o que flutua de verdade, com
 * deslocamento e desfoque reais; halo colorido de deslocamento zero é enfeite
 * e não entra.
 */
export const shadows = {
  card: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.36)' },
  floating: { boxShadow: '0px 14px 34px rgba(0, 0, 0, 0.52)' },
  primary: { boxShadow: '0px 6px 18px rgba(0, 0, 0, 0.45)' },
  stamp: { boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.40)' },
} satisfies Record<string, ViewStyle>;

/**
 * Caixa mista, pesos médios, entrelinha larga. A versão anterior usava caixa
 * alta e peso 800 em rótulo e botão — é exatamente o que fazia a tela parecer
 * software antigo de desktop.
 */
export const typography = {
  display: { fontFamily: fonts.semibold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  title: { fontFamily: fonts.semibold, fontSize: 25, lineHeight: 31, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 26, letterSpacing: -0.2 },
  subheading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15.5, lineHeight: 24 },
  caption: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: 0.1 },
  overline: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 15, letterSpacing: 1.2, textTransform: 'uppercase' },
  record: { fontFamily: fonts.mono, fontSize: 12.5, lineHeight: 18, letterSpacing: 0.2 },
  recordStrong: { fontFamily: fonts.monoBold, fontSize: 12.5, lineHeight: 18, letterSpacing: 0.4 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

interface Tone {
  background: string;
  text: string;
  icon: IconName;
  /** Rótulo curto do estado: o status continua legível sem depender de matiz. */
  mark: string;
}

/**
 * Cores de status sobre o fundo quente, todas acima de 4.5:1.
 *
 * Nenhuma delas ocupa a faixa do laranja da marca: status é informação, o
 * laranja é ação, e confundir os dois faria um animal denunciado parecer um
 * botão. Por isso o vermelho da denúncia puxa para o rosado, longe de #FF7A45.
 */
export const statusStyles: Record<AnimalStatus, Tone> = {
  denunciado: { background: '#3A1D1F', text: '#FF7A8A', icon: 'megaphone', mark: 'Denúncia' },
  resgatado: { background: '#382B16', text: '#F2C94C', icon: 'volunteer', mark: 'Resgate' },
  em_tratamento: { background: '#16292F', text: '#62BFEA', icon: 'health', mark: 'Tratamento' },
  disponivel: { background: '#182C24', text: '#55D191', icon: 'heart', mark: 'Adoção' },
  adotado: { background: '#272038', text: '#C3A2F0', icon: 'home', mark: 'Adotado' },
};

export const roleStyles: Record<UserRole, Tone & { description: string }> = {
  morador: {
    background: '#16292F',
    text: '#62BFEA',
    icon: 'home',
    mark: 'Morador',
    description: 'Registra denúncias, acompanha resgates e vê as vaquinhas.',
  },
  admin: {
    background: colors.primarySoft,
    text: colors.primary,
    icon: 'shield',
    mark: 'Admin',
    description: 'Gerencia animais, status, vaquinhas e usuários.',
  },
};
