/**
 * Estilo do mapa na paleta do app.
 *
 * Formato do Google Maps, aplicado via `customMapStyle` do react-native-maps.
 * Vale no Android; no iOS o componente usa Apple Maps, que não aceita JSON de
 * estilo — lá o mapa segue o modo escuro do sistema, o que fica próximo mas
 * não idêntico.
 *
 * O mapa é fundo, não conteúdo: tudo aqui é surdo de propósito, para que os
 * marcadores de animal (nas cores de status) sejam a única coisa saturada na
 * tela. Trânsito e pontos comerciais saem — não ajudam a encontrar um animal.
 */
export const MAP_STYLE_DARK = [
  { elementType: 'geometry', stylers: [{ color: '#16100E' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9C8878' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#16100E' }] },

  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#4D3C34' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#CDB9A9' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#9C8878' }] },

  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#1B1512' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1C2419' }, { visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2B211C' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#B09C8C' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#332721' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#463629' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },

  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#16262B' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5A7076' }] },
];

/** Arvorezinha/RS. Enquadramento inicial enquanto o GPS não responde. */
export const ARVOREZINHA_REGION = {
  latitude: -28.8738,
  longitude: -52.1753,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};
