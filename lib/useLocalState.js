'use client';

import { useEffect, useState } from 'react';

const PREFIX = 'wtt:';

/** useState mirrored into localStorage, SSR-safe (hydrates on the first effect). */
export function useLocalState(key, initial) {
  const [value, setValue] = useState(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {
      /* private mode or blocked storage — defaults are fine */
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* ignore quota / blocked storage */
    }
  }, [key, value, hydrated]);

  return [value, setValue];
}
