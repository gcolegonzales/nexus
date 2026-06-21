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
