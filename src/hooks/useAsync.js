import { useState, useRef, useEffect, useCallback } from "react";

/**
 * useAsync()
 *
 * Returns { data, loading, error, run, reset }
 *
 * - Prevents state updates after unmount (isMounted ref)
 * - Prevents concurrent runs (inflight ref) unless force:true is passed
 * - `run` is stable across renders (useCallback with no deps)
 */
export function useAsync() {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const isMounted  = useRef(true);
  const inflightRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const run = useCallback(async (asyncFn, { force = false } = {}) => {
    if (inflightRef.current && !force) return;
    inflightRef.current = true;
    if (isMounted.current) setState({ data: null, loading: true, error: null });
    try {
      const data = await asyncFn();
      if (isMounted.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (isMounted.current) setState({ data: null, loading: false, error });
      throw error;
    } finally {
      inflightRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    if (isMounted.current) setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, run, reset };
}

export default useAsync;