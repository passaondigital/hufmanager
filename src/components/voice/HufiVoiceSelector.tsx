import { useState, useRef, useCallback } from "react";
import { Play, Square, Check, Loader2, Volume2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getAllVoices,
  getSelectedVoiceId,
  getSelectedModel,
  setSelectedVoice,
  setSelectedModel,
  DEFAULT_MODEL,
  type HufiVoice,
} from "@/lib/hufi-voice-config";

const MODELS = [
  { id: "eleven_multilingual_v2", label: "Multilingual v2", desc: "Beste Qualität · Deutsch ausgezeichnet" },
  { id: "eleven_flash_v2_5",      label: "Flash v2.5",      desc: "Schneller · Etwas günstiger" },
  { id: "eleven_turbo_v2_5",      label: "Turbo v2.5",      desc: "Ultra-schnell · Für Live-Dialog" },
];

async function previewVoice(
  voice: HufiVoice,
  model: string,
  onStart: () => void,
  onEnd: () => void,
  onError: (msg: string) => void
) {
  if (voice.id === "browser") {
    if (!("speechSynthesis" in window)) { onError("Keine Browser-Stimme verfügbar."); return; }
    onStart();
    const utt = new SpeechSynthesisUtterance(voice.previewText);
    utt.lang = "de-DE";
    const voices = window.speechSynthesis.getVoices();
    const de = voices.find((v) => v.lang.startsWith("de"));
    if (de) utt.voice = de;
    utt.onend = onEnd;
    utt.onerror = () => { onEnd(); onError("Browser-TTS Fehler."); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
    return;
  }

  onStart();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Nicht angemeldet");

    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hufi-tts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: voice.previewText, voice_id: voice.id, model_id: model }),
      }
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Unbekannter Fehler" }));
      throw new Error(err.error ?? "TTS fehlgeschlagen");
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { onEnd(); URL.revokeObjectURL(url); };
    audio.onerror = () => { onEnd(); URL.revokeObjectURL(url); onError("Audio konnte nicht abgespielt werden."); };
    await audio.play();
  } catch (e) {
    onEnd();
    onError(e instanceof Error ? e.message : "Vorschau fehlgeschlagen");
  }
}

export function HufiVoiceSelector() {
  const voices = getAllVoices();
  const [selectedId, setSelectedId] = useState<string>(() => getSelectedVoiceId() ?? "browser");
  const [model, setModel] = useState(() => getSelectedModel());
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModels, setShowModels] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const handleSelect = useCallback((voice: HufiVoice) => {
    setSelectedVoice(voice);
    setSelectedId(voice.id);
    setError(null);
  }, []);

  const handleModelChange = useCallback((id: string) => {
    setSelectedModel(id);
    setModel(id);
  }, []);

  const handlePreview = useCallback(async (voice: HufiVoice) => {
    if (playing) {
      window.speechSynthesis?.cancel();
      stopRef.current?.();
      setPlaying(null);
      return;
    }
    setError(null);
    await previewVoice(
      voice,
      model,
      () => setPlaying(voice.id),
      () => setPlaying(null),
      (msg) => { setError(msg); setPlaying(null); },
    );
  }, [playing, model]);

  const selectedVoice = voices.find((v) => v.id === selectedId) ?? voices[0];

  return (
    <div style={{ paddingBottom: 8 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 700, color: "#9CA3AF",
        letterSpacing: ".06em", textTransform: "uppercase",
        margin: "0 0 4px",
      }}>
        Hufi Stimme
      </h3>
      <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px", lineHeight: 1.5 }}>
        Wähle die Stimme, mit der Hufi zu dir spricht. Tippe auf{" "}
        <Play size={11} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
        zum Probehören.
      </p>

      {/* Aktuell ausgewählt */}
      <div style={{
        background: "linear-gradient(135deg, #FFF7ED, #FFEDD5)",
        border: "1px solid rgba(249,115,22,0.3)",
        borderRadius: 12, padding: "10px 14px", marginBottom: 12,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Volume2 size={16} color="#FFFFFF" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>
            Aktiv: {selectedVoice.name}
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
            {MODELS.find((m) => m.id === model)?.label ?? model}
          </div>
        </div>
        <button
          onClick={() => handlePreview(selectedVoice)}
          style={{
            width: 34, height: 34, borderRadius: 8,
            background: playing === selectedVoice.id ? "#EF4444" : "#F97316",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
          }}
          aria-label="Aktive Stimme anhören"
        >
          {playing === selectedVoice.id
            ? <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
            : <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
          }
        </button>
      </div>

      {/* Fehler */}
      {error && (
        <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 10, padding: "8px 12px", background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA" }}>
          {error}
        </div>
      )}

      {/* Stimmen-Karten */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {voices.map((voice) => {
          const isSelected = selectedId === voice.id;
          const isPlaying = playing === voice.id;
          return (
            <div
              key={voice.id}
              style={{
                background: isSelected ? "#FFF7ED" : "#F9FAFB",
                border: `1.5px solid ${isSelected ? "#F97316" : "#E5E7EB"}`,
                borderRadius: 14, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 12,
                transition: "border-color .15s, background .15s",
              }}
            >
              {/* Auswahl-Kreis */}
              <button
                onClick={() => handleSelect(voice)}
                aria-label={`${voice.name} auswählen`}
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: `2px solid ${isSelected ? "#F97316" : "#D1D5DB"}`,
                  background: isSelected ? "#F97316" : "#FFFFFF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, cursor: "pointer",
                }}
              >
                {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
              </button>

              {/* Info */}
              <button
                onClick={() => handleSelect(voice)}
                style={{ flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{voice.name}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: ".05em",
                    textTransform: "uppercase",
                    background: voice.gender === "weiblich" ? "#FDF2F8" : voice.gender === "neutral" ? "#F0FDF4" : "#EFF6FF",
                    color: voice.gender === "weiblich" ? "#EC4899" : voice.gender === "neutral" ? "#10B981" : "#3B82F6",
                    borderRadius: 6, padding: "2px 6px",
                  }}>
                    {voice.gender}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: ".04em",
                    textTransform: "uppercase",
                    background: "#F9FAFB", color: "#9CA3AF",
                    borderRadius: 6, padding: "2px 6px", border: "1px solid #E5E7EB",
                  }}>
                    {voice.style}
                  </span>
                  {voice.recommended && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: ".04em",
                      textTransform: "uppercase",
                      background: "#F0FDF4", color: "#10B981",
                      borderRadius: 6, padding: "2px 6px",
                    }}>Empfohlen</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.4, marginTop: 3 }}>
                  {voice.description}
                </div>
              </button>

              {/* Vorschau-Button */}
              <button
                onClick={() => handlePreview(voice)}
                disabled={!!(playing && playing !== voice.id)}
                aria-label={isPlaying ? "Stoppen" : `${voice.name} anhören`}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: isPlaying ? "#EF4444" : "rgba(249,115,22,0.1)",
                  border: isPlaying ? "none" : "1px solid rgba(249,115,22,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: playing && playing !== voice.id ? "not-allowed" : "pointer",
                  flexShrink: 0, opacity: playing && playing !== voice.id ? 0.4 : 1,
                }}
              >
                {isPlaying
                  ? <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
                  : <Play size={14} color="#F97316" fill="#F97316" />
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* Modell-Auswahl (ausklappbar) */}
      <button
        onClick={() => setShowModels((s) => !s)}
        style={{
          width: "100%", marginTop: 12,
          background: "transparent", border: "1px solid #E5E7EB",
          borderRadius: 10, padding: "10px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          Qualitätsstufe: {MODELS.find((m) => m.id === model)?.label ?? model}
        </span>
        {showModels ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
      </button>

      {showModels && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => { handleModelChange(m.id); setShowModels(false); }}
              style={{
                textAlign: "left", background: model === m.id ? "#FFF7ED" : "#F9FAFB",
                border: `1.5px solid ${model === m.id ? "#F97316" : "#E5E7EB"}`,
                borderRadius: 10, padding: "10px 14px",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{m.label}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{m.desc}</div>
            </button>
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 10, lineHeight: 1.5 }}>
        ElevenLabs-Stimmen erfordern eine aktive Internetverbindung.
        Wenn keine Verbindung besteht, wechselt Hufi automatisch zur Browser-Stimme.
      </p>
    </div>
  );
}
