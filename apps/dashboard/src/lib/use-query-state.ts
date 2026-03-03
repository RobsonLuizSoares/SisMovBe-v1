'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function useQueryState<T extends string>(
  key: string,
  defaultValue: T = '' as T
): [T, (value: T | null) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();

  const value = (searchParams?.get(key) ?? defaultValue) as T;

  const setValue = useCallback(
    (newValue: T | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (newValue === null || newValue === '') {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }
      const query = params.toString();
      router.push(query ? `?${query}` : window.location.pathname);
    },
    [key, router, searchParams]
  );

  return [value, setValue];
}

export function useQueryStates<K extends string>(
  keys: readonly K[]
): [Record<K, string>, (updates: Partial<Record<K, string | null>>) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();

  const values = Object.fromEntries(keys.map((k) => [k, searchParams?.get(k) ?? ''])) as Record<
    K,
    string
  >;

  const setValues = useCallback(
    (updates: Partial<Record<K, string | null>>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      for (const [key, value] of Object.entries(updates) as [K, string | null][]) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const query = params.toString();
      router.push(query ? `?${query}` : window.location.pathname);
    },
    [router, searchParams]
  );

  return [values, setValues];
}
