import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { colors } from '../theme';

/** Pegada desenhada à mão em SVG, reutilizada em ilustrações e padrões decorativos. */
export function PawPrint({ size = 48, color = colors.primary, opacity = 1 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <PawShape color={color} />
    </Svg>
  );
}

function PawShape({ color }: { color: string }) {
  return (
    <G fill={color}>
      <Path d="M50 90c-15 0-27-8-27-19 0-10 9-17 15-25 4-6 7-10 12-10s8 4 12 10c6 8 15 15 15 25 0 11-12 19-27 19z" />
      <Ellipse cx="20" cy="44" rx="9" ry="12" transform="rotate(-25 20 44)" />
      <Ellipse cx="37" cy="20" rx="9.5" ry="13" transform="rotate(-8 37 20)" />
      <Ellipse cx="63" cy="20" rx="9.5" ry="13" transform="rotate(8 63 20)" />
      <Ellipse cx="80" cy="44" rx="9" ry="12" transform="rotate(25 80 44)" />
    </G>
  );
}

/** Coração com pegada: ilustração principal da marca. */
export function HeroIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.9} viewBox="0 0 200 180">
      <Circle cx="28" cy="30" r="8" fill="#FFFFFF" opacity={0.35} />
      <Circle cx="182" cy="52" r="5" fill="#FFFFFF" opacity={0.45} />
      <Circle cx="170" cy="150" r="10" fill="#FFFFFF" opacity={0.2} />
      <Path
        d="M100 168C42 126 12 98 12 60c0-28 21-48 47-48 18 0 32 10 41 24 9-14 23-24 41-24 26 0 47 20 47 48 0 38-30 66-88 108z"
        fill="#FFFFFF"
      />
      <G transform="translate(62 44) scale(0.76)">
        <PawShape color={colors.primary} />
      </G>
    </Svg>
  );
}

const PATTERN = [
  { top: '8%', left: '6%', size: 34, rotate: '-20deg' },
  { top: '18%', left: '78%', size: 44, rotate: '18deg' },
  { top: '52%', left: '12%', size: 26, rotate: '35deg' },
  { top: '62%', left: '84%', size: 30, rotate: '-12deg' },
  { top: '82%', left: '44%', size: 22, rotate: '10deg' },
] as const;

/** Pegadas espalhadas, usadas como textura sobre fundos com gradiente. */
export function PawPattern({ color = '#FFFFFF', opacity = 0.14 }: { color?: string; opacity?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PATTERN.map((paw, index) => (
        <View
          key={index}
          style={{ position: 'absolute', top: paw.top, left: paw.left, transform: [{ rotate: paw.rotate }] }}
        >
          <PawPrint size={paw.size} color={color} opacity={opacity} />
        </View>
      ))}
    </View>
  );
}
