import { useState, useEffect, useCallback } from "react";

/**
 * Hook to save form drafts to localStorage and restore them.
 * Clears the draft after successful save.
 */
export function useFormDraft<T>(key: string, defaultValue: T) {
  const storageKey = `draft_${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const [hasDraft, setHasDraft] = useState(() => {
    return !!localStorage.getItem(storageKey);
  });

  // Auto-save to localStorage on changes
  useEffect(() => {
    try {
      const serialized = JSON.stringify(value);
      const defaultSerialized = JSON.stringify(defaultValue);
      if (serialized !== defaultSerialized) {
        localStorage.setItem(storageKey, serialized);
        setHasDraft(true);
      }
    } catch {
      // Ignore serialization errors
    }
  }, [value, storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasDraft(false);
  }, [storageKey]);

  const restoreDraft = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setValue(JSON.parse(stored));
    } catch {
      // Ignore
    }
  }, [storageKey]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setValue(defaultValue);
    setHasDraft(false);
  }, [storageKey, defaultValue]);

  return { value, setValue, hasDraft, clearDraft, restoreDraft, discardDraft };
}
