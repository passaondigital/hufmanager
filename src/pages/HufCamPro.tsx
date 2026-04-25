import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, Zap, AlertTriangle, CheckCircle, ChevronLeft, RefreshCw, Tag } from "lucide-react";
import { processHufImage, getHufCamHistory, getHufImageUrl, HufPosition } from "@/lib/hufcam-service";

const BG = "#0a0a0a";
const CARD = "#1c1c1c";
const BORDER = "#303030";
const ORANGE = "#e8a020";
const TEXT = "#f0ece4";
const TEXT2 = "#999999";
const RED = "#e05050";
const GREEN = "#7ab87a";

const POSITIONS: { code: HufPosition; label: string; short: string }[] = [
  { code: "LV", label: "Links Vorne",  short: "LV" },
  { code: "LH", label: "Links Hinten", short: "LH" },
  { code: "RV", label: "Rechts Vorne", short: "RV" },
  { code: "RH", label: "Rechts Hinten",short: "RH" },
  { code: "sole", label: "Sohle",      short: "↓" },
  { code: "frog", label: "Strahl",     short: "🐴" },
];

export default function HufCamPro() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedHorse, setSelectedHorse] = useState<string>("");
  const [position, setPosition] = useState<HufPosition>("LV");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"capture" | "history">("capture");

  // Load horses
  const { data: horses = [] } = useQuery({
    queryKey: ["hufcam-horses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("horses")
        .select("id, name, photo_url")
        .eq("owner_id", user!.id)
        .order("name");
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 300_000,
  });

  // Load history for selected horse
  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ["hufcam-history", selectedHorse, position],
    queryFn: () => getHufCamHistory(selectedHorse, position),
    enabled: !!selectedHorse && view === "history",
    staleTime: 30_000,
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!selectedFile || !selectedHorse || !user?.id) {
      setError("Bitte Pferd und Bild auswählen.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const { analysis, imageId } = await processHufImage(selectedFile, user.id, selectedHorse, position);
      setResult({ ...analysis, imageId });
    } catch (err: any) {
      setError(err.message ?? "Analyse fehlgeschlagen.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div style={{ background: BG, minHeight: "100dvh", maxWidth: 430, margin: "0 auto", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, height: 56, display: "flex", alignItems: "center", paddingLeft: 12, paddingRight: 16, gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronLeft size={20} style={{ color: TEXT }} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>HufCam Pro</div>
          <div style={{ fontSize: 10, color: TEXT2 }}>KI-Hufanalyse</div>
        </div>
        <span style={{ background: "rgba(232,160,32,.15)", color: ORANGE, border: "1px solid rgba(232,160,32,.3)", borderRadius: 20, padding: "3px 8px", fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" as const }}>
          PRO
        </span>
        {/* View toggle */}
        <div style={{ display: "flex", background: "#151515", border: `1px solid ${BORDER}`, borderRadius: 20, padding: 2, marginLeft: 8 }}>
          {(["capture", "history"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "3px 10px", borderRadius: 16, fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer", background: view === v ? ORANGE : "transparent", color: view === v ? "#1a0a00" : TEXT2 }}>
              {v === "capture" ? "Aufnahme" : "Verlauf"}
            </button>
          ))}
        </div>
      </div>

      {view === "capture" && (
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Horse selector */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "#555", marginBottom: 8 }}>Pferd auswählen</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {horses.map((h: any) => (
                <button key={h.id} onClick={() => setSelectedHorse(h.id)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: `1px solid ${selectedHorse === h.id ? ORANGE : BORDER}`, background: selectedHorse === h.id ? "rgba(232,160,32,.15)" : "#151515", color: selectedHorse === h.id ? ORANGE : TEXT2, cursor: "pointer" }}>
                  {h.name}
                </button>
              ))}
              {horses.length === 0 && <span style={{ fontSize: 12, color: TEXT2 }}>Kein Pferd gefunden</span>}
            </div>
          </div>

          {/* Position selector */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "#555", marginBottom: 8 }}>Huf-Position</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {POSITIONS.map((p) => (
                <button key={p.code} onClick={() => setPosition(p.code)} style={{ padding: "8px 4px", borderRadius: 10, fontSize: 11, fontWeight: 600, border: `1px solid ${position === p.code ? ORANGE : BORDER}`, background: position === p.code ? "rgba(232,160,32,.15)" : "#151515", color: position === p.code ? ORANGE : TEXT2, cursor: "pointer", textAlign: "center" as const }}>
                  <div style={{ fontSize: 14, marginBottom: 2 }}>{p.short}</div>
                  <div style={{ fontSize: 9 }}>{p.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Camera / Upload */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
            {preview ? (
              <div style={{ position: "relative" }}>
                <img src={preview} alt="preview" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                <button onClick={() => { setPreview(null); setSelectedFile(null); setResult(null); }} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.7)", border: "none", borderRadius: 8, padding: "4px 10px", color: TEXT2, fontSize: 11, cursor: "pointer" }}>
                  Ändern
                </button>
                <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,.7)", borderRadius: 8, padding: "3px 8px", fontSize: 10, color: TEXT }}>
                  {POSITIONS.find(p => p.code === position)?.label} · {horses.find((h: any) => h.id === selectedHorse)?.name ?? "–"}
                </div>
              </div>
            ) : (
              <div style={{ height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer" }} onClick={() => fileInputRef.current?.click()}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(232,160,32,.12)", border: "1px solid rgba(232,160,32,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={24} style={{ color: ORANGE }} />
                </div>
                <div style={{ textAlign: "center" as const }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Foto aufnehmen</div>
                  <div style={{ fontSize: 11, color: TEXT2, marginTop: 3 }}>Kamera oder Galerie</div>
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: "none" }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(224,80,80,.1)", border: "1px solid rgba(224,80,80,.3)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={14} style={{ color: RED, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: RED }}>{error}</span>
            </div>
          )}

          {/* Analyze button */}
          {preview && !result && (
            <button onClick={handleAnalyze} disabled={analyzing} style={{ background: analyzing ? "#2a2a2a" : ORANGE, border: "none", borderRadius: 14, padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: analyzing ? "default" : "pointer", width: "100%" }}>
              {analyzing ? (
                <>
                  <RefreshCw size={16} style={{ color: TEXT2, animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: TEXT2 }}>KI analysiert…</span>
                </>
              ) : (
                <>
                  <Zap size={16} style={{ color: "#1a0a00" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1a0a00" }}>Huf analysieren</span>
                </>
              )}
            </button>
          )}

          {/* Result card */}
          {result && (
            <div style={{ background: CARD, border: `1px solid ${result.alert ? "rgba(224,80,80,.4)" : BORDER}`, borderRadius: 14, overflow: "hidden" }}>
              {/* Alert badge */}
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
                {result.alert ? (
                  <AlertTriangle size={14} style={{ color: RED }} />
                ) : (
                  <CheckCircle size={14} style={{ color: GREEN }} />
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: result.alert ? RED : GREEN }}>
                  {result.alert ? "⚠️ Befund auffällig — Kontrolle empfohlen" : "✓ Keine kritischen Befunde"}
                </span>
              </div>

              {/* Tags */}
              {result.tags?.length > 0 && (
                <div style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
                  {result.tags.map((tag: string) => (
                    <span key={tag} style={{ background: "rgba(232,160,32,.12)", border: "1px solid rgba(232,160,32,.2)", borderRadius: 20, padding: "2px 8px", fontSize: 10, color: ORANGE, fontWeight: 500 }}>
                      <Tag size={9} style={{ marginRight: 3 }} />{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "#555", marginBottom: 6 }}>Befund</div>
                <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.55, whiteSpace: "pre-wrap" as const }}>{result.description}</div>

                {result.crack_detected && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "#555", marginBottom: 6, marginTop: 12 }}>Rissanalyse</div>
                    <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.55 }}>{result.crack_analysis}</div>
                  </>
                )}

                {result.compare_summary && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "#555", marginBottom: 6, marginTop: 12 }}>Vergleich zum letzten Bild</div>
                    <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.55 }}>{result.compare_summary}</div>
                  </>
                )}

                <div style={{ marginTop: 10, fontSize: 10, color: "#444" }}>
                  Analysiert mit {result.model} · Position {result.position}
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 8 }}>
                <button onClick={() => { setResult(null); setPreview(null); setSelectedFile(null); }} style={{ flex: 1, background: "#151515", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px", fontSize: 12, color: TEXT2, cursor: "pointer" }}>
                  Neues Foto
                </button>
                <button onClick={() => setView("history")} style={{ flex: 1, background: "rgba(232,160,32,.12)", border: "1px solid rgba(232,160,32,.3)", borderRadius: 10, padding: "10px", fontSize: 12, color: ORANGE, cursor: "pointer", fontWeight: 500 }}>
                  Verlauf ansehen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History view */}
      {view === "history" && (
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "#555", marginBottom: 8 }}>Pferd</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {horses.map((h: any) => (
                <button key={h.id} onClick={() => setSelectedHorse(h.id)} style={{ padding: "5px 10px", borderRadius: 20, fontSize: 11, border: `1px solid ${selectedHorse === h.id ? ORANGE : BORDER}`, background: selectedHorse === h.id ? "rgba(232,160,32,.15)" : "#151515", color: selectedHorse === h.id ? ORANGE : TEXT2, cursor: "pointer" }}>
                  {h.name}
                </button>
              ))}
            </div>
          </div>

          {history.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px", textAlign: "center" as const }}>
              <Camera size={32} style={{ color: "#333", margin: "0 auto 10px" }} />
              <div style={{ fontSize: 13, color: TEXT2 }}>Noch keine HufCam-Aufnahmen für dieses Pferd</div>
            </div>
          ) : (
            history.map((entry: any, i: number) => (
              <div key={i} style={{ background: CARD, border: `1px solid ${entry.alert_triggered ? "rgba(224,80,80,.3)" : BORDER}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
                  {entry.image?.storage_path && (
                    <img src={getHufImageUrl(entry.image.storage_path)} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>
                      {entry.image?.position ?? "–"} · {entry.image?.created_at ? new Date(entry.image.created_at).toLocaleDateString("de-DE") : "–"}
                    </div>
                    {entry.alert_triggered && <div style={{ fontSize: 10, color: RED, marginTop: 2 }}>⚠ Befund auffällig</div>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, maxWidth: 100 }}>
                    {(entry.tags ?? []).slice(0, 2).map((t: string) => (
                      <span key={t} style={{ background: "rgba(232,160,32,.1)", border: "1px solid rgba(232,160,32,.2)", borderRadius: 20, padding: "1px 6px", fontSize: 9, color: ORANGE }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: TEXT2, lineHeight: 1.5 }}>{entry.description?.slice(0, 120)}…</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
