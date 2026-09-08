import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DraftEnvelope<T> = {
  version: 1;
  savedAt: string;
  route?: string;
  recordId?: string;
  step?: string | number;
  tab?: string;
  section?: string;
  value: T;
};

export type FormDraftOptions = {
  userId?: string | null;
  route?: string;
  recordId?: string;
  step?: string | number;
  tab?: string;
  section?: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readEnvelope<T>(storageKey: string): DraftEnvelope<T> | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftEnvelope<T> | T;
    if (parsed && typeof parsed === "object" && "value" in parsed && "version" in parsed) {
      return parsed as DraftEnvelope<T>;
    }
    return { version: 1, savedAt: new Date(0).toISOString(), value: parsed as T };
  } catch {
    return null;
  }
}

/** Drafts survive remount, reload and mobile backgrounding until explicitly cleared. */
export function useFormDraft<T>(key: string, defaultValue: T, options: FormDraftOptions = {}) {
  const storageKey = useMemo(
    () => `draft_${options.userId ? `${options.userId}__` : "anonymous__"}${key}`,
    [key, options.userId],
  );
  const metadata = useMemo(
    () => ({
      route: options.route,
      recordId: options.recordId,
      step: options.step,
      tab: options.tab,
      section: options.section,
    }),
    [options.route, options.recordId, options.step, options.tab, options.section],
  );
  const initialEnvelope = useMemo(() => readEnvelope<T>(storageKey), [storageKey]);
  const [value, setValue] = useState<T>(() => initialEnvelope?.value ?? defaultValue);
  const [hasDraft, setHasDraft] = useState(() => initialEnvelope !== null);
  const latestValue = useRef(value);
  const latestMetadata = useRef(metadata);
  const defaultValueRef = useRef(defaultValue);
  const hydratedStorageKey = useRef(storageKey);

  if (hydratedStorageKey.current !== storageKey) {
    hydratedStorageKey.current = "";
  }

  latestValue.current = value;
  latestMetadata.current = metadata;
  defaultValueRef.current = defaultValue;

  useEffect(() => {
    const envelope = readEnvelope<T>(storageKey);
    setValue(envelope?.value ?? defaultValueRef.current);
    setHasDraft(envelope !== null);
    hydratedStorageKey.current = storageKey;
  }, [storageKey]);

  const persist = useCallback(() => {
    if (!canUseStorage() || hydratedStorageKey.current !== storageKey) return;
    try {
      if (JSON.stringify(latestValue.current) === JSON.stringify(defaultValueRef.current)) {
        window.localStorage.removeItem(storageKey);
        setHasDraft(false);
        return;
      }
      const envelope: DraftEnvelope<T> = {
        version: 1,
        savedAt: new Date().toISOString(),
        ...latestMetadata.current,
        value: latestValue.current,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(envelope));
      setHasDraft(true);
    } catch {
      // Storage quota/private-mode errors must never break the form.
    }
  }, [storageKey]);

  useEffect(() => persist(), [value, persist]);

  useEffect(() => {
    const flush = () => persist();
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [persist]);

  const clearDraft = useCallback(() => {
    if (canUseStorage()) window.localStorage.removeItem(storageKey);
    setHasDraft(false);
  }, [storageKey]);

  const restoreDraft = useCallback(() => {
    const envelope = readEnvelope<T>(storageKey);
    if (envelope) {
      setValue(envelope.value);
      setHasDraft(true);
    }
  }, [storageKey]);

  const discardDraft = useCallback(() => {
    if (canUseStorage()) window.localStorage.removeItem(storageKey);
    setValue(defaultValueRef.current);
    setHasDraft(false);
  }, [storageKey]);

  return { value, setValue, hasDraft, clearDraft, restoreDraft, discardDraft, persist };
}
