import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { colors } from '../theme';

/**
 * O Caramelo, mascote do login: cabeça laranja, focinho bege e orelhas caídas
 * de cachorro (orelha redonda no alto lê urso).
 *
 * Cada parte que se mexe é uma camada própria, para que o movimento seja só
 * transform e rode na thread nativa.
 */
export type Mood = 'open' | 'closed' | 'peek' | 'sad';

export const CARAMELO_SIZE = 120;


export function Caramelo({
  mood,
  look,
  reduced,
  intro,
}: {
  mood: Mood;
  look: { x: number; y: number };
  reduced: boolean;
  /** Toca a abertura ao montar: orelhas balançam, cabeça inclina, pisca. */
  intro: boolean;
}) {
  const eyeX = useRef(new Animated.Value(0)).current;
  const eyeY = useRef(new Animated.Value(0)).current;
  const lidL = useRef(new Animated.Value(0)).current;
  const lidR = useRef(new Animated.Value(0)).current;
  // Orelhas: -1 empinadas (abertura), 0 em repouso, 1 murchas (triste).
  const ears = useRef(new Animated.Value(intro && !reduced ? -1 : 0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const busy = useRef(intro && !reduced);

  // Abertura (~1,1s): orelhas caem com mola frouxa, a cabeça inclina curiosa
  // e ele pisca. Depois disso, só reage.
  useEffect(() => {
    if (!intro || reduced) {
      ears.setValue(0);
      return;
    }
    const blink = (to: number, duration: number) =>
      Animated.parallel([
        Animated.timing(lidL, { toValue: to, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(lidR, { toValue: to, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]);
    Animated.parallel([
      Animated.sequence([
        Animated.delay(220),
        Animated.spring(ears, { toValue: 0, damping: 6, stiffness: 140, mass: 0.7, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(520),
        Animated.timing(tilt, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.sequence([Animated.delay(980), blink(1, 80), blink(0, 120)]),
    ]).start(() => (busy.current = false));
  }, [intro, reduced, ears, tilt, lidL, lidR]);

  useEffect(() => {
    const config = { duration: reduced ? 0 : 160, easing: Easing.out(Easing.quad), useNativeDriver: true };
    Animated.parallel([Animated.timing(eyeX, { ...config, toValue: look.x }), Animated.timing(eyeY, { ...config, toValue: look.y })]).start();
  }, [look.x, look.y, reduced, eyeX, eyeY]);

  useEffect(() => {
    if (busy.current) return;
    const targets: Record<Mood, { l: number; r: number; ears: number }> = {
      open: { l: 0, r: 0, ears: 0 },
      closed: { l: 1, r: 1, ears: 0 },
      peek: { l: 1, r: 0.2, ears: 0 },
      sad: { l: 0.4, r: 0.4, ears: 1 },
    };
    const t = targets[mood];
    const config = { duration: reduced ? 0 : 180, easing: Easing.out(Easing.cubic), useNativeDriver: true };
    Animated.parallel([
      Animated.timing(lidL, { ...config, toValue: t.l }),
      Animated.timing(lidR, { ...config, toValue: t.r }),
      Animated.timing(ears, { ...config, toValue: t.ears }),
    ]).start();
  }, [mood, reduced, lidL, lidR, ears]);

  // Pisca a cada ~4,8s enquanto está de olho aberto.
  useEffect(() => {
    if (reduced || mood !== 'open') return;
    const id = setInterval(() => {
      if (busy.current) return;
      const close = { toValue: 1, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true };
      const open = { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true };
      Animated.sequence([
        Animated.parallel([Animated.timing(lidL, close), Animated.timing(lidR, close)]),
        Animated.parallel([Animated.timing(lidL, open), Animated.timing(lidR, open)]),
      ]).start();
    }, 4800);
    return () => clearInterval(id);
  }, [mood, reduced, lidL, lidR]);

  const earAngle = (side: 1 | -1) =>
    ears.interpolate({ inputRange: [-1, 0, 1], outputRange: [`${side * -32}deg`, `${side * 10}deg`, `${side * 2}deg`] });

  return (
    <Animated.View
      style={[styles.box, { transform: [{ rotate: tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-9deg'] }) }] }]}
      accessibilityRole="image"
      accessibilityLabel="Caramelo, o cachorro mascote do Patinhas em Ação"
    >
      {/* Rosto de antes: cabeça redonda, focinho bege e nariz. */}
      <View style={styles.head}>
        <View style={styles.muzzle}>
          <View style={styles.nose} />
        </View>
      </View>

      {/* Olhos: o olho anda dentro da órbita; a pálpebra (da cor da cabeça) desce por cima. */}
      {[lidL, lidR].map((lid, i) => (
        <View key={i} style={[styles.socket, { left: i === 0 ? 29 : 67 }]}>
          <Animated.View style={{ transform: [{ translateX: eyeX }, { translateY: eyeY }] }}>
            <View style={styles.pupil} />
          </Animated.View>
          <Animated.View style={[styles.lid, { transform: [{ scaleY: lid }] }]} />
        </View>
      ))}

      {/* Orelhas caídas por cima das laterais da cabeça, presas no alto. */}
      {([1, -1] as const).map((side) => (
        <Animated.View
          key={side}
          style={[
            styles.ear,
            side === 1 ? { left: -10 } : { right: -10 },
            { transformOrigin: side === 1 ? '75% 10%' : '25% 10%', transform: [{ rotate: earAngle(side) }] },
          ]}
        >
          <Svg width={30} height={56} viewBox="0 0 30 56">
            <G transform={side === 1 ? undefined : 'translate(30 0) scale(-1 1)'}>
              <Path d="M23 2C11 2 2 14 2.5 31C3 45 8.5 55 16 54C25 53 28.5 40 28 23C27.7 12 27 2 23 2Z" fill={colors.primaryDark} />
              <Path d="M20 10C13 12 9 21 10 33" stroke="#C9542A" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5} />
            </G>
          </Svg>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { width: CARAMELO_SIZE, height: CARAMELO_SIZE },
  head: {
    position: 'absolute',
    left: 2,
    top: 8,
    width: 116,
    height: 110,
    borderRadius: 58,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  muzzle: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    width: 62,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    paddingTop: 7,
  },
  nose: { width: 20, height: 13, borderRadius: 7, backgroundColor: colors.onPrimary },
  socket: { position: 'absolute', top: 44, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pupil: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.onPrimary },
  lid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.primary, transformOrigin: 'top' },
  ear: { position: 'absolute', top: 20 },
});
