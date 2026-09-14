import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/**
 * Ícones nativos: SF Symbols no iOS e Material Symbols no Android/web.
 * Os nomes semânticos abaixo evitam espalhar nomes de plataforma pelas telas.
 */
const ICONS = {
  paw: { ios: 'pawprint.fill', android: 'pets' },
  search: { ios: 'magnifyingglass', android: 'search' },
  filter: { ios: 'slider.horizontal.3', android: 'tune' },
  add: { ios: 'plus', android: 'add' },
  home: { ios: 'house.fill', android: 'home' },
  person: { ios: 'person.fill', android: 'person' },
  people: { ios: 'person.2.fill', android: 'group' },
  mail: { ios: 'envelope.fill', android: 'mail' },
  lock: { ios: 'lock.fill', android: 'lock' },
  eye: { ios: 'eye.fill', android: 'visibility' },
  eyeOff: { ios: 'eye.slash.fill', android: 'visibility_off' },
  phone: { ios: 'phone.fill', android: 'call' },
  camera: { ios: 'camera.fill', android: 'photo_camera' },
  gallery: { ios: 'photo.on.rectangle', android: 'photo_library' },
  close: { ios: 'xmark', android: 'close' },
  edit: { ios: 'pencil', android: 'edit' },
  trash: { ios: 'trash.fill', android: 'delete' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  heart: { ios: 'heart.fill', android: 'favorite' },
  location: { ios: 'mappin.and.ellipse', android: 'location_on' },
  health: { ios: 'cross.case.fill', android: 'medical_services' },
  clock: { ios: 'clock.fill', android: 'schedule' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  alert: { ios: 'exclamationmark.circle.fill', android: 'error' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  shield: { ios: 'checkmark.shield.fill', android: 'admin_panel_settings' },
  volunteer: { ios: 'hand.raised.fill', android: 'volunteer_activism' },
  key: { ios: 'key.fill', android: 'key' },
  info: { ios: 'info.circle.fill', android: 'info' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  ruler: { ios: 'ruler', android: 'straighten' },
  cake: { ios: 'birthday.cake.fill', android: 'cake' },
  mood: { ios: 'face.smiling', android: 'mood' },
  megaphone: { ios: 'megaphone.fill', android: 'campaign' },
  map: { ios: 'map.fill', android: 'map' },
  donate: { ios: 'heart.circle.fill', android: 'volunteer_activism' },
  copy: { ios: 'doc.on.doc.fill', android: 'content_copy' },
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
}

export function Icon({ name, size = 22, color = '#1D2433' }: IconProps) {
  const icon = ICONS[name];
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android, web: icon.android }}
      size={size}
      tintColor={color}
    />
  );
}
