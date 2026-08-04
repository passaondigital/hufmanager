import { useCallback, useState } from "react";
import { clearTextDraft, readTextDraft, saveTextDraft, type TextDraft } from "@/lib/offline/textDrafts";

/** Local-only text preservation; sending remains an explicit online action. */
export function useTextDraft(scope: string) {
  const [draft, setDraft] = useState<TextDraft | undefined>(() => readTextDraft(scope));
  const save = useCallback((text: string) => { const saved = saveTextDraft(scope, text); if (saved) setDraft(readTextDraft(scope)); return saved; }, [scope]);
  const clear = useCallback(() => { const cleared = clearTextDraft(scope); if (cleared) setDraft(undefined); return cleared; }, [scope]);
  const restore = useCallback(() => { const restored = readTextDraft(scope); setDraft(restored); return restored; }, [scope]);
  return { draft, save, clear, restore };
}
