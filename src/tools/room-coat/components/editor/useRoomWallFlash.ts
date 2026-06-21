"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

const FLASH_DURATION_MS = 2800;
const FLASH_PULSES = 3;
const FLASH_PEAK = 0.55;

/** Slow pulsing flash intensity (0–1) for room wall highlight. */
export function useRoomWallFlash(flashKey: number | undefined): number {
  const startRef = useRef<number | null>(null);
  const [intensity, setIntensity] = useState(0);

  useEffect(() => {
    if (flashKey == null) {
      startRef.current = null;
      setIntensity(0);
      return;
    }
    startRef.current = performance.now();
  }, [flashKey]);

  useFrame(() => {
    const start = startRef.current;
    if (start == null) return;

    const elapsed = performance.now() - start;
    if (elapsed >= FLASH_DURATION_MS) {
      startRef.current = null;
      setIntensity(0);
      return;
    }

    const t = elapsed / FLASH_DURATION_MS;
    const pulse = (Math.sin(t * Math.PI * 2 * FLASH_PULSES) + 1) / 2;
    const envelope = 1 - t;
    setIntensity(pulse * envelope * FLASH_PEAK);
  });

  return intensity;
}
