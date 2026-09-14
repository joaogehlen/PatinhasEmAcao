import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SIZE_LABELS, STATUS_LABELS, type Animal } from '@/domain/entities/Animal';
import { Icon } from '@/presentation/components/Icon';
import { AppText } from '@/presentation/components/ui';
import { formatAge } from '@/presentation/format';
import { useCurrentLocation } from '@/presentation/hooks/useCurrentLocation';
import { useFocusedQuery } from '@/presentation/hooks/useFocusedQuery';
import { ARVOREZINHA_REGION, MAP_STYLE_DARK } from '@/presentation/mapStyle';
import { useAuth, useServices } from '@/presentation/providers/AppProviders';
import { colors, radius, rules, shadows, spacing, statusStyles } from '@/presentation/theme';

/**
 * Tela inicial: o mapa.
 *
 * É a primeira coisa que qualquer pessoa vê, com ou sem conta, porque o
 * momento crítico do produto é alguém na rua vendo um animal em risco.
 *
 * O que muda por perfil:
 *   convidado — vê a própria localização e as denúncias que ele mesmo abriu
 *   morador   — vê todas as denúncias já registradas
 *   admin     — o mesmo, e toca num ponto para acompanhar e mudar o status
 */
export default function MapScreen() {
  const { animals } = useServices();
  const { can } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { coords, status: locationStatus, request } = useCurrentLocation();

  const query = useCallback(async () => animals.list(), [animals]);
  const { data } = useFocusedQuery(query);

  /** Só entra no mapa quem tem coordenada; denúncia antiga pode não ter. */
  const located = useMemo(
    () => (data ?? []).filter((animal) => animal.latitude !== null && animal.longitude !== null),
    [data],
  );

  const initialRegion: Region = coords
    ? { ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : ARVOREZINHA_REGION;

  async function centerOnMe() {
    const next = coords ?? (await request());
    if (next) {
      mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/*
        O provider NÃO é forçado.

        No iOS dentro do Expo Go, passar PROVIDER_GOOGLE devolve tela em branco
        sem erro nenhum: o SDK do Google Maps não vem no Expo Go do iPhone.
        Deixando o padrão, o Android usa Google Maps e o iOS usa Apple Maps,
        e nenhum dos dois precisa de chave em desenvolvimento.

        Como consequência, customMapStyle só vale no Android — Apple Maps não
        aceita JSON de estilo. No iOS o escuro vem de userInterfaceStyle.
      */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={Platform.OS === 'android' ? MAP_STYLE_DARK : undefined}
        userInterfaceStyle="dark"
        showsUserLocation={locationStatus === 'granted'}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {located.map((animal) => (
          <AnimalMarker
            key={animal.id}
            animal={animal}
            onPress={() => router.push(`/animals/${animal.id}`)}
          />
        ))}
      </MapView>

      {locationStatus === 'denied' && (
        <View style={[styles.notice, { bottom: insets.bottom + 150 }]}>
          <Icon name="location" size={18} color={colors.primary} />
          <AppText variant="caption" color={colors.textSoft} style={{ flex: 1 }}>
            Sem acesso à localização, a denúncia vai sem o ponto no mapa. Autorize nas configurações do aparelho.
          </AppText>
        </View>
      )}

      {/* Empilhadas no canto inferior direito: é onde o polegar alcança com
          uma mão só, que é como o app é usado na rua. */}
      <View style={[styles.actions, { bottom: insets.bottom + spacing.sm }]} pointerEvents="box-none">
        <Pressable
          onPress={centerOnMe}
          accessibilityRole="button"
          accessibilityLabel="Centralizar na minha localização"
          style={({ pressed }) => [styles.locateButton, pressed && { opacity: 0.8 }]}
        >
          {locationStatus === 'loading' ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Icon name="location" size={22} color={colors.text} />
          )}
        </Pressable>

        {can('animal:create') && (
          <Pressable
            onPress={() => router.push('/animals/new')}
            accessibilityRole="button"
            accessibilityLabel="Registrar denúncia de animal"
            style={({ pressed }) => [styles.reportButton, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}
          >
            <Icon name="megaphone" size={20} color={colors.onPrimary} />
            <AppText variant="button" color={colors.onPrimary}>
              Denunciar
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Marcador na cor do status, com cartão ao tocar.
 *
 * O pino é desenhado à mão porque o do Google é vermelho fixo e não sabe
 * dizer se o animal foi resgatado. O cartão mostra foto e nome: quem está no
 * mapa precisa reconhecer o bicho antes de decidir abrir a ficha inteira.
 */
function AnimalMarker({ animal, onPress }: { animal: Animal; onPress: () => void }) {
  const tone = statusStyles[animal.status];
  // No Android o balão é desenhado como bitmap no momento em que abre; se a
  // foto ainda não chegou, sai vazia. Redesenhar quando ela carrega resolve.
  const [photoReady, setPhotoReady] = useState(false);

  return (
    <Marker
      coordinate={{ latitude: animal.latitude!, longitude: animal.longitude! }}
      onCalloutPress={onPress}
      tracksViewChanges={false}
    >
      <View style={[styles.marker, { borderColor: tone.text, backgroundColor: tone.background }]}>
        <Icon name={tone.icon} size={16} color={tone.text} />
      </View>

      <Callout tooltip key={photoReady ? 'ready' : 'loading'}>
        <View style={styles.callout}>
          <View style={styles.calloutPhoto}>
            {animal.photoUri ? (
              <Image
                source={{ uri: animal.photoUri }}
                contentFit="cover"
                cachePolicy="memory-disk"
                onLoadEnd={() => setPhotoReady(true)}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <Icon name={tone.icon} size={28} color={colors.textMuted} />
            )}
          </View>

          <View style={styles.calloutBody}>
            <AppText variant="subheading" numberOfLines={1}>
              {animal.name}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
              {SIZE_LABELS[animal.size]} · {formatAge(animal.ageMonths)}
            </AppText>
            <View style={styles.calloutFooter}>
              <View style={[styles.calloutStatus, { backgroundColor: tone.background }]}>
                <AppText variant="label" color={tone.text}>
                  {STATUS_LABELS[animal.status]}
                </AppText>
              </View>
              <Icon name="chevronRight" size={16} color={colors.textMuted} />
            </View>
          </View>
        </View>
        {/* Bico do balão, desenhado à mão porque `tooltip` remove o padrão. */}
        <View style={styles.calloutTip} />
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  notice: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: rules.hair,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },

  actions: {
    position: 'absolute',
    right: spacing.lg,
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  locateButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: rules.hair,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },

  marker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: rules.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Largura fixa: o balão do mapa não herda medida do container.
  callout: {
    width: 232,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: rules.hair,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  calloutPhoto: {
    height: 116,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutBody: { padding: spacing.md, gap: 3 },
  calloutFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  calloutStatus: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  calloutTip: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.surface,
  },
});
