import { useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";

interface Note {
  id: string;
  text: string;
  createdAt: Date;
}

export default function Notizen() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const stored = localStorage.getItem("hufi_notizen");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) }));
      }
    } catch {}
    return [];
  });
  const [input, setInput] = useState("");

  function save(updated: Note[]) {
    setNotes(updated);
    localStorage.setItem("hufi_notizen", JSON.stringify(updated));
  }

  function addNote() {
    const text = input.trim();
    if (!text) return;
    save([{ id: crypto.randomUUID(), text, createdAt: new Date() }, ...notes]);
    setInput("");
  }

  function deleteNote(id: string) {
    save(notes.filter((n) => n.id !== id));
  }

  return (
    <div style={{ background: "#F5F5F5", minHeight: "100dvh", padding: "24px 16px 88px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", marginBottom: 20, letterSpacing: "-0.3px" }}>
        Notizen
      </h1>

      {/* Input area */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          padding: 14,
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
          marginBottom: 20,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              addNote();
            }
          }}
          placeholder="Neue Notiz eingeben…"
          rows={2}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: 14,
            color: "#1A1A1A",
            background: "transparent",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={addNote}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#F97316",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Plus size={18} style={{ color: "#FFFFFF" }} />
        </button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <FileText size={40} style={{ color: "#D1D5DB", margin: "0 auto 12px" }} />
          <p style={{ color: "#9CA3AF", fontSize: 14 }}>Noch keine Notizen</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                padding: "14px 14px 12px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, color: "#1A1A1A", margin: 0, lineHeight: 1.5 }}>{note.text}</p>
                <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
                  {note.createdAt.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => deleteNote(note.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  flexShrink: 0,
                }}
              >
                <Trash2 size={16} style={{ color: "#D1D5DB" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
