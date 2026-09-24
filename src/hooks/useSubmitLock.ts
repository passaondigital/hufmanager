import { useRef } from "react";
import { createSubmitLock } from "@/lib/submitLock";

/** Eine Sperre pro Komponenteninstanz, stabil über Re-Renders. */
export function useSubmitLock() {
  const ref = useRef<ReturnType<typeof createSubmitLock> | null>(null);
  if (!ref.current) ref.current = createSubmitLock();
  return ref.current;
}
