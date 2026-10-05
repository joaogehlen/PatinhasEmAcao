import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Teclado aberto. Serve para esconder a barra de ações fixa no rodapé: no
 * Android a tela encolhe e a barra subiria por cima do campo em edição.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}
