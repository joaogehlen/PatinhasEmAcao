import type { ReactNode } from 'react';
import { Text, View, type ViewProps } from 'react-native';

/**
 * react-native-maps não roda no navegador. Este stub só existe para o Expo Web
 * abrir (é por ele que os protótipos são vistos no navegador); o metro.config
 * o usa apenas na plataforma web. No celular o mapa é o de verdade.
 */
function MapView({ style }: ViewProps & { children?: ReactNode }) {
  return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#9C8878' }}>O mapa só aparece no celular.</Text>
    </View>
  );
}

export default MapView;
export const Marker = (_: { children?: ReactNode }) => null;
export const Callout = (_: { children?: ReactNode }) => null;
export const PROVIDER_GOOGLE = 'google';
export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
