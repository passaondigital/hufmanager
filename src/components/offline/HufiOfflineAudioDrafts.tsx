import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listOfflineAudioDrafts, removeOfflineAudioDraft, type OfflineAudioDraft } from "@/lib/offline/audioDraftStore";
import { formatDraftDate, formatDuration, formatFileSize } from "@/lib/offline/audioDraftFormat";
import { HufiButton, HufiIconButton, HufiSurface } from "@/design-system/hufi/primitives";

/** On-demand duration lookup -- OfflineAudioDraft stores no duration, and we never guess one. */
function useAudioDuration(blob: Blob): string | null {
  const [duration, setDuration] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const onLoaded = () => {
      if (!cancelled && Number.isFinite(audio.duration)) setDuration(formatDuration(audio.duration));
    };
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      cancelled = true;
      audio.removeEventListener("loadedmetadata", onLoaded);
      URL.revokeObjectURL(url);
    };
  }, [blob]);
  return duration;
}

function AudioDraftRow({ draft, onDelete }: { draft: OfflineAudioDraft; onDelete: (id: string) => void }) {
  const duration = useAudioDuration(draft.blob);
  return (
    <HufiSurface raised={false} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{formatDraftDate(draft.createdAt)}</span>
        <span style={{ fontSize: 12, color: "var(--hufi-muted)" }}>
          {formatFileSize(draft.blob.size)} · {duration ?? "Dauer unbekannt"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <HufiButton type="button" variant="quiet" disabled title="Nur online möglich" style={{ fontSize: 12, padding: "0 10px", minHeight: 36, opacity: 0.5, cursor: "not-allowed" }}>
          Später verarbeiten
        </HufiButton>
        <HufiIconButton type="button" aria-label="Aufnahme löschen" onClick={() => onDelete(draft.id)}>
          <Trash2 size={18} aria-hidden="true" />
        </HufiIconButton>
      </div>
    </HufiSurface>
  );
}

/** Real, scoped display of locally stored offline audio drafts -- no upload, no transcription, no cross-user access. */
export function HufiOfflineAudioDrafts() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<OfflineAudioDraft[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setDrafts([]);
      setLoaded(true);
      return;
    }
    const list = await listOfflineAudioDrafts({ userId: user.id });
    setDrafts(list);
    setLoaded(true);
  }, [user?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      await removeOfflineAudioDraft({ userId: user.id }, id);
      void reload();
    },
    [user?.id, reload],
  );

  if (!user?.id) {
    return <p style={{ margin: 0, fontSize: 13, color: "var(--hufi-muted)" }}>Bitte anmelden, um lokale Aufnahmen zu sehen.</p>;
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>Offline-Entwürfe</h3>
      {!loaded ? null : drafts.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--hufi-muted)" }}>Keine gespeicherten Aufnahmen.</p>
      ) : (
        drafts.map((d) => <AudioDraftRow key={d.id} draft={d} onDelete={handleDelete} />)
      )}
    </div>
  );
}
