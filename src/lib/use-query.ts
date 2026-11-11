import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, errorMessage } from '@/lib/api';

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  errorStatus: number | null;
  reload: () => void;
}

export function useQuery<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[],
  enabled = true,
): QueryState<T> {
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
    errorStatus: number | null;
  }>({
    data: null,
    loading: enabled,
    error: null,
    errorStatus: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setRefreshing(true);
    setNonce((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state when the query key changes
    setState((current) => ({
      data: current.data,
      loading: current.data === null,
      error: null,
      errorStatus: null,
    }));

    loaderRef
      .current()
      .then((data) => {
        if (active) {
          setState({ data, loading: false, error: null, errorStatus: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState((current) => ({
            data: current.data,
            loading: false,
            error: errorMessage(error),
            errorStatus: error instanceof ApiError ? error.status : null,
          }));
        }
      })
      .finally(() => {
        if (active) {
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  if (!enabled) {
    return { data: null, loading: false, refreshing: false, error: null, errorStatus: null, reload };
  }
  return { ...state, refreshing, reload };
}
