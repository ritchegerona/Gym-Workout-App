import { useCallback, useEffect, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps
  const memoFn = useCallback(fn, deps);

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    memoFn()
      .then((d) => setData(d))
      .catch((e) => {
        console.error(e);
        setError("Something went wrong. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [memoFn]);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run };
}
