import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

/**
 * Localização atual do aparelho.
 *
 * A denúncia acontece na rua, e a coordenada é o dado que faz o voluntário
 * achar o animal. Por isso o erro é tratado como estado de tela — negada,
 * indisponível — e não como exceção: o app precisa continuar utilizável e
 * dizer o que fazer, não sumir.
 */
export function useCurrentLocation() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>('loading');

  const request = useCallback(async () => {
    setStatus('loading');
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setStatus('denied');
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoords(next);
      setStatus('granted');
      return next;
    } catch {
      // GPS desligado, sem sinal, emulador sem localização definida.
      setStatus('unavailable');
      return null;
    }
  }, []);

  useEffect(() => {
    void request();
  }, [request]);

  return { coords, status, request };
}
