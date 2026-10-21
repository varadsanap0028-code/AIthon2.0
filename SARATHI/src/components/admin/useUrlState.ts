import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

// Synchronizes state values bidirectionally with URL query search parameters.
export function useUrlState(defaults: Record<string, string> = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const getParam = useCallback(
    (key: string): string => {
      return searchParams.get(key) ?? defaults[key] ?? '';
    },
    [searchParams, defaults]
  );

  const setParam = useCallback(
    (key: string, value: string | number | null | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null || value === undefined || value === '' || value === defaults[key]) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, defaults]
  );

  const resetParams = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return { getParam, setParam, resetParams, searchParams };
}

export default useUrlState;
