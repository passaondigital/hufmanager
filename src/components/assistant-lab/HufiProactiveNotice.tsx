import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import type { MockProactiveNotice } from "./HufiAssistantState";
import { requiresConfirmation, type HufiActionId } from "./HufiActionPolicy";

interface HufiProactiveNoticeProps {
  notice: MockProactiveNotice;
  onDismiss: () => void;
}

const ACTION_POLICY_ID: Record<string, HufiActionId> = {
  "add-address": "proactive.addAddress",
  "ask-customer": "proactive.askCustomer",
  "remind-later": "proactive.remindLater",
};

const ACTION_FEEDBACK: Record<string, string> = {
  "add-address": "Adresse ergänzt (Entwurf).",
  "ask-customer": "Nachricht an die Kundin vorbereitet (Entwurf).",
  "remind-later": "Ich erinnere dich später.",
};

// Einziges Ambient-Mode-Element, das nicht auf dem dunklen Scrim liegt —
// braucht daher eigene, dunkle Tinte statt der cremefarbenen Vordergrundtöne
// der Conversation-/Immersive-Bausteine (siehe .hlab-proactive-card in
// hufi-lab.css).
export function HufiProactiveNotice({ notice, onDismiss }: HufiProactiveNoticeProps) {
  const [actedId, setActedId] = useState<string | null>(null);

  useEffect(() => {
    if (!actedId) return;
    const timeout = window.setTimeout(onDismiss, 1600);
    return () => window.clearTimeout(timeout);
  }, [actedId, onDismiss]);

  const handleAction = (id: string) => {
    // requiresConfirmation() ist hier bewusst dokumentierend eingebunden: im
    // Prototyp lösen alle drei Aktionen nur eine sichtbare Mock-Rückmeldung
    // aus, keine echte Bestätigung wird abgefragt.
    void requiresConfirmation(ACTION_POLICY_ID[id]);
    setActedId(id);
  };

  return (
    <div role="status" aria-label="Proaktiver Hinweis von Hufi" className="hlab-foreground-interactive hlab-proactive-card">
      <button type="button" onClick={onDismiss} aria-label="Hinweis ausblenden" className="hlab-focusable hlab-proactive-dismiss">
        <X size={13} aria-hidden="true" />
      </button>

      <div style={{ display: "flex", gap: 9, alignItems: "flex-start", paddingRight: 22 }}>
        <BellRing size={15} style={{ marginTop: 1, color: "var(--hufi-orange)", flexShrink: 0 }} aria-hidden="true" />
        <div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.45, fontWeight: 650, color: "#241D17" }}>{notice.message}</p>
          <p style={{ margin: "4px 0 0", fontSize: 11.5, lineHeight: 1.4, color: "rgba(36,29,23,0.6)" }}>{notice.reason}</p>
        </div>
      </div>

      {actedId ? (
        <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 600, color: "rgba(36,29,23,0.7)" }}>{ACTION_FEEDBACK[actedId]}</p>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {notice.actions.map((action) => (
            <button key={action.id} type="button" onClick={() => handleAction(action.id)} className="hlab-focusable hlab-proactive-action">
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
