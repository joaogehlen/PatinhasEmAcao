import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** "Reduzir movimento" do sistema: com ele ligado, animação vai direto ao estado final. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}
