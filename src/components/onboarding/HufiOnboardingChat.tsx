import React, { useState, useEffect, useRef } from "react";
import { Play, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProfessionDiscovery, buildValuePitch } from "@/lib/profession-discovery";
import { updateHufiMemory } from "@/lib/hufi-brain";
import { HUFI_VOICES, setSelectedVoice, DEFAULT_MODEL, type HufiVoice } from "@/lib/hufi-voice-config";
import { previewVoice } from "@/components/voice/HufiVoiceSelector";
import { db } from "@/lib/supabase-loose";

interface HufiOnboardingChatProps {
  userId: string;
  onComplete: (data: { name: string; role: string; region: string }) => void;
}

// 0 Name · 1 Beruf · 2 Use-Case · 3 Herausforderungen · 4 Pitch · 5 Stimme · 6 Bereit
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Die beiden Basis-Stimmen (nicht Basis+/Premium) für die Onboarding-Auswahl.
const ONBOARDING_VOICES = HUFI_VOICES.filter((v) => !v.isCustom);

interface Message {
  from: "hufi" | "user";
  text: string;
  id: number;
}

// Labels für den Chat → kanonische profession-config-Keys (siehe profession-config.ts).
const ROLES: { label: string; key: string }[] = [
  { label: "Hufbearbeiter", key: "hoof_care" },
  { label: "Hufschmied", key: "farrier" },
  { label: "Osteopath", key: "osteopath" },
  { label: "Physiotherapeut", key: "physiotherapist" },
  { label: "Equine Dentist", key: "dentist" },
  { label: "Sattler", key: "saddler" },
  { label: "Mobiler Tierarzt", key: "vet_mobile" },
  { label: "Reitlehrer", key: "riding_instructor" },
  { label: "Pferdemassage", key: "massage" },
  { label: "Sonstiges", key: "other" },
];

const fadeInStyle: React.CSSProperties = {
  animation: "hufi-fadein 0.35s ease both",
};

export function HufiOnboardingChat({ userId, onComplete }: HufiOnboardingChatProps) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [professionKey, setProfessionKey] = useState("");
  const [useCaseAnswer, setUseCaseAnswer] = useState("");
  const [challenges, setChallenges] = useState<string[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const msgCounter = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  function nextId() {
    msgCounter.current += 1;
    return msgCounter.current;
  }

  function addHufi(text: string) {
    setMessages((prev) => [...prev, { from: "hufi", text, id: nextId() }]);
  }

  function addUser(text: string) {
    setMessages((prev) => [...prev, { from: "user", text, id: nextId() }]);
  }

  // Initial Hufi greeting — erst NACH dem Willkommens-Screen (started === true)
  useEffect(() => {
    if (!started) return;
    const timer = setTimeout(() => {
      addHufi(
        "Hallo! Ich bin Hufi – dein persönlicher Assistent für alles rund ums Pferd. " +
          "Damit ich dich wirklich unterstützen kann, lerne ich dich kurz kennen.\n\nWie heißt du?"
      );
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  async function handleVoiceSelect(voice: HufiVoice) {
    setSelectedVoice(voice, userId);
    setSelectedVoiceName(voice.name);
    addUser(voice.name);
    setStep(6);
    setTimeout(() => {
      addHufi(`Perfekt, ${name}. Alles eingerichtet — ich bin bereit für dich.`);
    }, 500);
  }

  async function handleVoicePreview(voice: HufiVoice) {
    if (playingVoiceId) {
      window.speechSynthesis?.cancel();
      setPlayingVoiceId(null);
      return;
    }
    await previewVoice(
      voice,
      DEFAULT_MODEL,
      () => setPlayingVoiceId(voice.id),
      () => setPlayingVoiceId(null),
      () => setPlayingVoiceId(null),
    );
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleNameSubmit() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setName(trimmed);
    addUser(trimmed);
    setInputValue("");
    setStep(1);
    setTimeout(() => {
      addHufi(`Schön, ${trimmed}! Welcher Beruf beschreibt dich am besten?`);
    }, 500);
  }

  // Schlag 1 → Beruf gewählt: Use-Case-Verfeinerung erfragen
  function handleRoleSelect(opt: { label: string; key: string }) {
    setRole(opt.label);
    setProfessionKey(opt.key);
    addUser(opt.label);
    setStep(2);
    const disc = getProfessionDiscovery(opt.key);
    setTimeout(() => addHufi(disc.useCase.question), 500);
  }

  // Schlag 2 → Use-Case beantwortet: Cross-User-Einblick + Herausforderungen erfragen
  async function handleUseCaseSelect(answer: string) {
    setUseCaseAnswer(answer);
    addUser(answer);
    setStep(3);

    // M3: anonymisierter Cross-User-Einblick ("andere [Beruf] nutzen mich oft für…")
    let hint = "";
    try {
      const { data } = await db
        .from("profession_insights")
        .select("challenge_key, count")
        .eq("profession_type", professionKey)
        .order("count", { ascending: false })
        .limit(3);
      if (data && data.length > 0) {
        const disc = getProfessionDiscovery(professionKey);
        const labels = data
          .map((r: { challenge_key: string }) => disc.challenges.find((c) => c.key === r.challenge_key)?.label)
          .filter(Boolean);
        if (labels.length > 0) {
          hint = `Andere in deinem Beruf lassen sich von mir oft bei *${labels.join(", ")}* helfen.\n\n`;
        }
      }
    } catch {
      // Tabelle ggf. noch nicht vorhanden → Onboarding läuft trotzdem weiter
    }

    setTimeout(() => {
      addHufi(`${hint}Was kostet dich aktuell am meisten Zeit und Nerven? (Mehrfachauswahl)`);
    }, 500);
  }

  function toggleChallenge(key: string) {
    setChallenges((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  // Schlag 3 → Herausforderungen bestätigt: Hufi stellt passenden Nutzen vor
  function handleChallengesConfirm() {
    const disc = getProfessionDiscovery(professionKey);
    const chosenLabels = challenges
      .map((k) => disc.challenges.find((c) => c.key === k)?.label)
      .filter(Boolean);
    addUser(chosenLabels.length > 0 ? chosenLabels.join(", ") : "Erstmal schauen");
    setStep(4);

    const pitches = buildValuePitch(professionKey, challenges);
    setTimeout(() => {
      if (pitches.length > 0) {
        addHufi(`${name}, genau dafür bin ich da:`);
        pitches.forEach((p, i) => setTimeout(() => addHufi(`• ${p}`), 350 * (i + 1)));
        setTimeout(
          () => addHufi("Und ich lerne mit jeder Aufgabe dazu. Wie soll ich klingen, wenn ich mit dir spreche?"),
          350 * (pitches.length + 1)
        );
      } else {
        addHufi(`${name}, ich begleite dich Schritt für Schritt — und lerne mit jeder Aufgabe dazu. Wie soll ich klingen, wenn ich mit dir spreche?`);
      }
      setStep(5);
    }, 500);
  }

  async function handleFinish() {
    setSaving(true);
    const professionType = professionKey || "hoof_care";
    try {
      await supabase
        .from("profiles")
        .update({
          onboarding_step: 7,
          onboarding_completed: true,
          full_name: name,
          profession_type: professionType,
          profession_slug: professionType,
          onboarding_data: { name, role, useCase: useCaseAnswer, challenges, voice: selectedVoiceName },
        })
        .eq("id", userId);

      // profession_type auch in business_settings spiegeln (Upsert)
      const { data: existing } = await supabase
        .from("business_settings")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        await supabase.from("business_settings").update({ profession_type: professionType } as any).eq("user_id", userId);
      } else {
        await supabase.from("business_settings").insert({ user_id: userId, profession_type: professionType } as any);
      }

      // Berufsspezifische Default-Service-Presets anlegen
      await supabase.rpc("create_default_service_presets", {
        _provider_id: userId,
        _profession_type: professionType,
      });

      // M2: Use-Case + Herausforderungen ins Gedächtnis säen → Hufi ist ab Tag 1 proaktiv
      const disc = getProfessionDiscovery(professionType);
      if (useCaseAnswer) {
        await updateHufiMemory(userId, "preference", "onboarding_use_case",
          { content: `Arbeitsweise: ${useCaseAnswer}` }, "system").catch(() => {});
      }
      if (challenges.length > 0) {
        const labels = challenges
          .map((k) => disc.challenges.find((c) => c.key === k)?.label)
          .filter(Boolean);
        await updateHufiMemory(userId, "preference", "onboarding_challenges",
          { content: `Wichtigste Herausforderungen: ${labels.join(", ")}`, keys: challenges }, "system").catch(() => {});
      }

      // M3: anonymisiertes Berufs-Aggregat hochzählen (keine User-Verknüpfung)
      if (challenges.length > 0) {
        await db.rpc("increment_profession_insights", {
          _profession_type: professionType,
          _challenge_keys: challenges,
        }).then(undefined, () => { /* Tabelle/RPC ggf. noch nicht da → ignorieren */ });
      }
    } catch (err) {
      console.warn("[HufiOnboarding] save failed:", err);
    } finally {
      setSaving(false);
      onComplete({ name, role, region: useCaseAnswer });
    }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    padding: "9px 12px",
    fontSize: "14px",
    outline: "none",
    color: "#1A1A1A",
    background: "#FFFFFF",
  };

  const nextBtnStyle: React.CSSProperties = {
    background: "#F97316",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "9px 16px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    flexShrink: 0,
  };

  const roleButtonStyle: React.CSSProperties = {
    background: "transparent",
    color: "#F97316",
    border: "1.5px solid #F97316",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    margin: "4px",
  };

  const disc = getProfessionDiscovery(professionKey);

  // Schritt 0: Willkommens-Screen — noch kein Chat, nur ein Einstieg.
  if (!started) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          maxWidth: "440px",
          margin: "0 auto",
          padding: "32px 24px",
          boxSizing: "border-box",
          textAlign: "center",
          gap: "20px",
        }}
      >
        <img
          src="/hufi-splash.webp"
          alt="Hufi"
          style={{ width: "88px", height: "88px", objectFit: "contain" }}
        />
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#1A1A1A", margin: "0 0 8px" }}>
            Willkommen bei HufiApp
          </h1>
          <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.6, margin: 0 }}>
            Ich bin Hufi, dein proaktiver Mitarbeiter — ich behalte Termine, Kunden und Pferde im Blick, damit du dich um dein Handwerk kümmern kannst.
          </p>
        </div>
        <button
          style={{
            background: "#F97316", color: "#FFFFFF", border: "none",
            borderRadius: "10px", padding: "13px 28px", fontSize: "15px",
            fontWeight: 700, cursor: "pointer",
          }}
          onClick={() => setStarted(true)}
        >
          Los geht's →
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes hufi-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          maxWidth: "540px",
          margin: "0 auto",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        {/* Top bar with icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <img
            src="/hufi-splash.webp"
            alt="Hufi"
            style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }}
          />
          <span style={{ fontSize: "15px", fontWeight: "700", color: "#1A1A1A" }}>
            Hufi – Dein Assistent
          </span>
        </div>

        {/* Message list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            paddingBottom: "12px",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
                ...fadeInStyle,
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  borderRadius: msg.from === "hufi" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                  padding: "10px 14px",
                  background: msg.from === "hufi" ? "#FFF7ED" : "#F3F4F6",
                  color: "#1A1A1A",
                  fontSize: "14px",
                  lineHeight: "1.55",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input area per step */}
        <div style={{ paddingTop: "8px", borderTop: "1px solid #F3F4F6" }}>
          {step === 0 && (
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                style={inputStyle}
                placeholder="Dein Vorname..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                autoFocus
              />
              <button style={nextBtnStyle} onClick={handleNameSubmit}>
                Weiter
              </button>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", ...fadeInStyle }}>
              {ROLES.map((r) => (
                <button key={r.key} style={roleButtonStyle} onClick={() => handleRoleSelect(r)}>
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", ...fadeInStyle }}>
              {disc.useCase.options.map((opt) => (
                <button key={opt} style={roleButtonStyle} onClick={() => handleUseCaseSelect(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div style={{ ...fadeInStyle }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                {disc.challenges.map((c) => {
                  const active = challenges.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      style={{
                        ...roleButtonStyle,
                        background: active ? "#F97316" : "transparent",
                        color: active ? "#FFFFFF" : "#F97316",
                      }}
                      onClick={() => toggleChallenge(c.key)}
                    >
                      {active ? "✓ " : ""}{c.label}
                    </button>
                  );
                })}
              </div>
              <button style={{ ...nextBtnStyle, width: "100%", padding: "11px" }} onClick={handleChallengesConfirm}>
                Weiter
              </button>
            </div>
          )}

          {step === 5 && (
            <div style={{ ...fadeInStyle, display: "flex", flexDirection: "column", gap: "8px" }}>
              {ONBOARDING_VOICES.map((voice) => (
                <div
                  key={voice.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    border: "1.5px solid #F97316", borderRadius: "10px",
                    padding: "10px 12px",
                  }}
                >
                  <button
                    style={{ ...roleButtonStyle, margin: 0, flex: 1, textAlign: "left" }}
                    onClick={() => handleVoiceSelect(voice)}
                  >
                    🎙️ {voice.name.replace("Hufi ", "")}
                  </button>
                  <button
                    onClick={() => handleVoicePreview(voice)}
                    aria-label={`${voice.name} anhören`}
                    style={{
                      width: "34px", height: "34px", borderRadius: "8px",
                      background: playingVoiceId === voice.id ? "#EF4444" : "#FFF7ED",
                      border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    {playingVoiceId === voice.id
                      ? <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
                      : <Play size={14} color="#F97316" fill="#F97316" />
                    }
                  </button>
                </div>
              ))}
              <p style={{ fontSize: "11px", color: "#9CA3AF", textAlign: "center", margin: "4px 0 0" }}>
                Später jederzeit in den Einstellungen änderbar.
              </p>
            </div>
          )}

          {step === 6 && (
            <div style={fadeInStyle}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                {[
                  "Sag „Hey Hufi“ oder tippe in das Textfeld",
                  "Probier: „Zeig mir meine Termine“",
                  "Oder tippe auf einen der Quick-Buttons",
                ].map((hint) => (
                  <div key={hint} style={{ fontSize: "12.5px", color: "#6B7280", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "#F97316" }}>•</span> {hint}
                  </div>
                ))}
              </div>
              <button
                style={{
                  ...nextBtnStyle,
                  width: "100%",
                  padding: "12px",
                  fontSize: "15px",
                  opacity: saving ? 0.7 : 1,
                }}
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? "Wird gespeichert..." : "HufiApp starten 🚀"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default HufiOnboardingChat;
