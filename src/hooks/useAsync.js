import { useCallback, useEffect, useRef, useState } from 'react';

// Runs an async loader and tracks loading, error and data. reload() runs it again.
export function useAsync(loader, deps) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const my = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      if (my === seq.current) setState({ loading: false, error: null, data });
      return data;
    } catch (error) {
      if (my === seq.current) setState((s) => ({ loading: false, error, data: s.data }));
      return null;
    }
  }, [run]);

  useEffect(() => {
    // Loading data on mount and when inputs change is the purpose of this hook.
    reload();
  }, [reload]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
