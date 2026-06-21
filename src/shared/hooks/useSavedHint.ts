"use client";

import { useEffect, useState } from "react";

export function useSavedHint(durationMs = 2000): {
  saved: boolean;
  showSaved: () => void;
} {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [saved, durationMs]);

  return {
    saved,
    showSaved: () => setSaved(true),
  };
}
