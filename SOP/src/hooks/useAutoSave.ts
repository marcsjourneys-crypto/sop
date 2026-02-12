import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({ data, onSave, delay = 1500, enabled = true }: UseAutoSaveOptions<T>) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>('');

  const save = useCallback(async (dataToSave: T) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(dataToSave);
      setLastSaved(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;

    const dataString = JSON.stringify(data);

    // Skip if data hasn't changed
    if (dataString === lastDataRef.current) return;
    lastDataRef.current = dataString;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save(data);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  return {
    saving,
    lastSaved,
    error,
    saveNow: () => save(data)
  };
}
