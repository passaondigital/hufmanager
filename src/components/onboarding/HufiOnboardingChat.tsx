import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HufiOnboardingChatProps {
  userId: string;
  onComplete: (data: { name: string; role: string; region: string }) => void;
}

type Step = 0 | 1 | 2 | 3 | 4;

interface Message {
  from: "hufi" | "user";
  text: string;
  id: number;
}

const ROLES = ["Hufschmied", "Hufpfleger", "Tierarzt"];

const fadeInStyle: React.CSSProperties = {
  animation: "hufi-fadein 0.35s ease both",
};

export function HufiOnboardingChat({ userId, onComplete }: HufiOnboardingChatProps) {
  const [step, setStep] = useState<Step>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [region, setRegion] = useState("");
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

  // Initial Hufi greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      addHufi(
        "Hallo! Ich bin Hufi – dein persönlicher Assistent für alles rund ums Pferd. " +
          "Damit ich dich gut unterstützen kann, stelle ich dir kurz ein paar Fragen. " +
          "Das dauert nur 2–3 Minuten.\n\nWie heißt du?"
      );
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      addHufi(
        `Schön, ${trimmed}! Arbeitest du als Hufschmied, Hufpfleger oder Tierarzt?`
      );
    }, 500);
  }

  function handleRoleSelect(selectedRole: string) {
    setRole(selectedRole);
    addUser(selectedRole);
    setStep(2);
    setTimeout(() => {
      addHufi("In welchem Ort oder Region bist du hauptsächlich tätig?");
    }, 500);
  }

  function handleRegionSubmit() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setRegion(trimmed);
    addUser(trimmed);
    setInputValue("");
    setStep(3);
    setTimeout(() => {
      addHufi(
        "Hast du einen ersten Kunden? Dann können wir gleich loslegen."
      );
    }, 500);
  }

  function handleClientChoice(addNow: boolean) {
    addUser(addNow ? "Jetzt hinzufügen" : "Später");
    setStep(4);
    setTimeout(() => {
      addHufi(
        `${name}, alles klar! Hufi ist bereit. Dein Dashboard wartet.`
      );
    }, 500);
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          onboarding_step: 5,
          onboarding_completed: true,
          onboarding_data: { name, role, region },
        })
        .eq("id", userId);
    } catch (err) {
      console.warn("[HufiOnboarding] save failed:", err);
    } finally {
      setSaving(false);
      onComplete({ name, role, region });
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

  const clientBtnStyle = roleButtonStyle;

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
            src="https://upload.assaon.com/files/medien/goldenespferd.png"
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
                <button key={r} style={roleButtonStyle} onClick={() => handleRoleSelect(r)}>
                  {r}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", gap: "8px", ...fadeInStyle }}>
              <input
                style={inputStyle}
                placeholder="z.B. München, Oberbayern..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegionSubmit()}
                autoFocus
              />
              <button style={nextBtnStyle} onClick={handleRegionSubmit}>
                Weiter
              </button>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", ...fadeInStyle }}>
              <button style={clientBtnStyle} onClick={() => handleClientChoice(true)}>
                Jetzt hinzufügen
              </button>
              <button
                style={{ ...clientBtnStyle, color: "#6B7280", borderColor: "#D1D5DB" }}
                onClick={() => handleClientChoice(false)}
              >
                Später
              </button>
            </div>
          )}

          {step === 4 && (
            <div style={fadeInStyle}>
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
                {saving ? "Wird gespeichert..." : "Los geht's"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default HufiOnboardingChat;
