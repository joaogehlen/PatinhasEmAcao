import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { describeError } from '../format';

/**
 * Carrega dados sempre que a tela ganha foco e sempre que a consulta muda
 * (ex.: filtros), para refletir alterações feitas em outras telas.
 */
export function useFocusedQuery<T>(query: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await query());
      setError(null);
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  // useFocusEffect roda de novo quando o callback muda enquanto a tela está focada.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, error, loading, reload };
}
