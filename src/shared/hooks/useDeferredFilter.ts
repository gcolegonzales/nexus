import { useEffect, useRef, useState } from "react";

export function useDeferredFilter<T>(
  filterKey: string,
  value: T,
  delayMs = 200,
) {
  const committedKeyRef = useRef(filterKey);
  const [animateKey, setAnimateKey] = useState(filterKey);
  const [deferredValue, setDeferredValue] = useState(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (filterKey === committedKeyRef.current) {
      setDeferredValue(value);
      // Resolve any in-flight pending state when the key reverts to the
      // committed one before the debounce timer fires; otherwise isPending
      // would stay stuck true forever.
      setIsPending(false);
      return;
    }

    setIsPending(true);

    const timer = window.setTimeout(() => {
      committedKeyRef.current = filterKey;
      setAnimateKey(filterKey);
      setDeferredValue(value);
      setIsPending(false);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [filterKey, value, delayMs]);

  return {
    value: deferredValue,
    isPending,
    animateKey,
  };
}
