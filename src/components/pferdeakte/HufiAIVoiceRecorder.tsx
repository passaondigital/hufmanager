import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Mic, Square, Loader2, Check, RotateCcw, X, Lightbulb, AlertTriangle } from "lucide-react";

export interface HoofFindingResult {
  befund: string;
  massnahme: string;
  empfehlung: string;
  huf_werte: {
    toe_length_mm: number | null;
    heel_height_mm: number | null;
    hoof_angle_degrees: number | null;
    frog_quality: string | null;
    wall_quality: string | null;
  };
  naechster_termin_wochen: number | null;
  dringend_tierarzt: boolean;
  dringend_osteo: boolean;
}

interface Props {
  horseId: string;
  appointmentId: string | null;
  onFindingGenerated: (finding: HoofFindingResult) => void;
  onClose?: () => void;
}

type RecorderState = "idle" | "recording" | "processing" | "result";

export function HufiAIVoiceRecorder({ horseId, appointmentId, onFindingGenerated, onClose }: Props) {
  const { user } = useAuth();
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [finding, setFinding] = useState<HoofFindingResult | null>(null);
  const [micAvailable, setMicAvailable] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        processAudio(blob);
      };

      recorder.start();
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setMicAvailable(false);
      setManualMode(true);
      toast.error("Mikrofon nicht verfügbar – Texteingabe aktiviert");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setState("processing");
  }, []);

  const processAudio = async (blob: Blob) => {
    try {
      // Convert blob to base64 and send directly to edge function for STT + analysis
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const audioBase64 = btoa(binary);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Nicht eingeloggt");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hufi-ai-voice-finding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            horse_id: horseId,
            appointment_id: appointmentId,
            audio_base64: audioBase64,
            audio_mime: blob.type,
          }),
        }
      );

      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        throw new Error(data?.error || "AI-Analyse fehlgeschlagen");
      }

      setTranscript(data.transcript || "");
      setFinding(data.finding);
      setState("result");
    } catch (err: any) {
      console.error("Voice processing error:", err);
      toast.error(err.message || "Fehler bei der Verarbeitung. Bitte versuche die Texteingabe.");
      setManualMode(true);
      setState("idle");
    }
  };

  const processManualText = async () => {
    if (!manualText.trim()) return;
    setState("processing");
    try {
      const { data, error } = await supabase.functions.invoke("hufi-ai-voice-finding", {
        body: { horse_id: horseId, appointment_id: appointmentId, transcript: manualText },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "AI-Analyse fehlgeschlagen");

      setTranscript(manualText);
      setFinding(data.finding);
      setState("result");
    } catch (err: any) {
      console.error("Text processing error:", err);
      toast.error("Fehler bei der AI-Analyse");
      setState("idle");
    }
  };

  const handleAccept = () => {
    if (finding) onFindingGenerated(finding);
  };

  const reset = () => {
    setState("idle");
    setDuration(0);
    setTranscript("");
    setFinding(null);
    setManualText("");
  };

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-4">
        {/* Idle / Recording */}
        {(state === "idle" || state === "recording") && !manualMode && (
          <div className="flex flex-col items-center gap-3 py-4">
            <button
              onClick={state === "idle" ? startRecording : stopRecording}
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                state === "recording"
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {state === "recording" ? <Square className="h-6 w-6" /> : <Mic className="h-7 w-7" />}
            </button>
            {state === "recording" ? (
              <div className="text-center">
                <p className="text-lg font-mono font-bold text-foreground">{formatDuration(duration)}</p>
                <p className="text-xs text-muted-foreground">Zum Stoppen tippen</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-foreground font-medium">Sprachnotiz aufnehmen</p>
                <p className="text-xs text-muted-foreground mt-0.5">Audio wird automatisch transkribiert</p>
                <button onClick={() => setManualMode(true)} className="text-xs text-primary mt-1 underline">
                  Lieber Text eingeben
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual text input fallback */}
        {state === "idle" && manualMode && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Befund als Text eingeben</Label>
            <Textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Beschreibe den Hufbefund, Maßnahmen und Empfehlungen..."
              rows={4}
              className="text-base"
            />
            <div className="flex gap-2">
              <Button onClick={processManualText} disabled={!manualText.trim()} className="flex-1 gap-2">
                <Lightbulb className="h-4 w-4" />
                HufiAI analysieren
              </Button>
              {micAvailable && (
                <Button variant="outline" onClick={() => setManualMode(false)}>
                  <Mic className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Processing */}
        {state === "processing" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">HufiAI analysiert...</p>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">Spracherkennung</Badge>
              <Badge variant="secondary" className="text-xs">→ Analyse</Badge>
              <Badge variant="secondary" className="text-xs">→ Befund</Badge>
            </div>
          </div>
        )}

        {/* Result */}
        {state === "result" && finding && (
          <div className="space-y-4">
            {/* Transcript */}
            <div>
              <Label className="text-xs text-muted-foreground">Transkription</Label>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={2}
                className="text-xs text-muted-foreground mt-1"
              />
            </div>

            {/* Structured fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Befund</Label>
                <Textarea
                  value={finding.befund}
                  onChange={(e) => setFinding({ ...finding, befund: e.target.value })}
                  rows={2}
                  className="text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Maßnahme</Label>
                <Textarea
                  value={finding.massnahme}
                  onChange={(e) => setFinding({ ...finding, massnahme: e.target.value })}
                  rows={2}
                  className="text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Empfehlung</Label>
                <Textarea
                  value={finding.empfehlung}
                  onChange={(e) => setFinding({ ...finding, empfehlung: e.target.value })}
                  rows={2}
                  className="text-sm mt-1"
                />
              </div>

              {/* Hoof values */}
              {finding.huf_werte && (
                <div className="grid grid-cols-3 gap-2">
                  {finding.huf_werte.toe_length_mm != null && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Zehenlänge</Label>
                      <Input
                        type="number"
                        value={finding.huf_werte.toe_length_mm || ""}
                        onChange={(e) => setFinding({
                          ...finding,
                          huf_werte: { ...finding.huf_werte, toe_length_mm: e.target.value ? Number(e.target.value) : null }
                        })}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  {finding.huf_werte.hoof_angle_degrees != null && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Hufwinkel</Label>
                      <Input
                        type="number"
                        value={finding.huf_werte.hoof_angle_degrees || ""}
                        onChange={(e) => setFinding({
                          ...finding,
                          huf_werte: { ...finding.huf_werte, hoof_angle_degrees: e.target.value ? Number(e.target.value) : null }
                        })}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  {finding.huf_werte.heel_height_mm != null && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Trachtenhöhe</Label>
                      <Input
                        type="number"
                        value={finding.huf_werte.heel_height_mm || ""}
                        onChange={(e) => setFinding({
                          ...finding,
                          huf_werte: { ...finding.huf_werte, heel_height_mm: e.target.value ? Number(e.target.value) : null }
                        })}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Alerts */}
              {(finding.dringend_tierarzt || finding.dringend_osteo) && (
                <div className="flex flex-wrap gap-2">
                  {finding.dringend_tierarzt && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Tierarzt empfohlen
                    </Badge>
                  )}
                  {finding.dringend_osteo && (
                    <Badge className="bg-purple-500/15 text-purple-600 border border-purple-500/30 gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Osteopathie empfohlen
                    </Badge>
                  )}
                </div>
              )}

              {finding.naechster_termin_wochen != null && (
                <p className="text-xs text-muted-foreground">
                  Nächster Termin empfohlen in {finding.naechster_termin_wochen} Wochen
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAccept} className="flex-1 gap-2">
                <Check className="h-4 w-4" />
                Übernehmen
              </Button>
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              {onClose && (
                <Button variant="ghost" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
