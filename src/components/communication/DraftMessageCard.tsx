import React from "react";
import { MessageSquare, Mail } from "lucide-react";
import { DraftMessage } from "@/lib/hufi-communication";

interface DraftMessageCardProps {
  draft: DraftMessage;
  onDismiss: () => void;
}

export function DraftMessageCard({ draft, onDismiss }: DraftMessageCardProps) {
  const isWhatsApp = draft.type === "whatsapp";

  const handleOpen = () => {
    window.open(draft.deepLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        display: "flex",
        overflow: "hidden",
        marginBottom: "12px",
      }}
    >
      {/* Orange left stripe */}
      <div style={{ width: "4px", background: "#F97316", flexShrink: 0 }} />

      <div style={{ padding: "16px", flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          {isWhatsApp ? (
            <MessageSquare size={16} color="#F97316" />
          ) : (
            <Mail size={16} color="#F97316" />
          )}
          <span style={{ fontSize: "14px", fontWeight: "bold", color: "#1A1A1A" }}>
            Entwurf bereit
          </span>
        </div>

        {/* Recipient */}
        <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 8px 0" }}>
          An: {draft.toName}
        </p>

        {/* Subject line for email */}
        {draft.subject && (
          <p style={{ fontSize: "12px", color: "#374151", margin: "0 0 6px 0", fontStyle: "italic" }}>
            Betreff: {draft.subject}
          </p>
        )}

        {/* Message preview */}
        <pre
          style={{
            fontSize: "12px",
            color: "#374151",
            background: "#F9FAFB",
            borderRadius: "6px",
            padding: "8px 10px",
            margin: "0 0 12px 0",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "120px",
            overflow: "hidden",
            fontFamily: "inherit",
            lineHeight: "1.5",
          }}
        >
          {draft.body}
        </pre>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={handleOpen}
            style={{
              background: "#F97316",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {isWhatsApp ? "Senden mit WhatsApp" : "E-Mail öffnen"}
          </button>
          <button
            onClick={onDismiss}
            style={{
              background: "transparent",
              color: "#6B7280",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Verwerfen
          </button>
        </div>
      </div>
    </div>
  );
}

export default DraftMessageCard;
