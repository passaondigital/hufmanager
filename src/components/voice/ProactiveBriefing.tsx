import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Volume2 } from "lucide-react";
import { useHufiTTS } from "@/hooks/useHufiTTS";
import { markBriefingShown, type BriefingPayload } from "@/lib/hufai-proactive";
import { HufiVoiceWave } from "@/components/voice/HufiVoiceWave";

interface Props {
  payload: BriefingPayload;
  onDismiss: () => void;
}

export function ProactiveBriefing({ payload, onDismiss }: Props) {
  const navigate = useNavigate();
  const { speak, cancel, isSupported, isSpeaking } = useHufiTTS();
  const spokenRef = useRef(false);

  useEffect(() => {
    markBriefingShown();
    if (isSupported && !spokenRef.current) {
      spokenRef.current = true;
      // Small delay so the slide-in animation completes before speech starts.
      const t = setTimeout(() => speak(payload.text), 350);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { cancel(); };
  }, [cancel]);

  const handleAction = (route: string) => {
    cancel();
    onDismiss();
    navigate(route);
  };

  const handleDismiss = () => {
    cancel();
    onDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={handleDismiss}
    >
      <div
        className="w-full rounded-t-3xl px-6 pt-5 pb-8 animate-in slide-in-from-bottom duration-300"
        style={{ backgroundColor: "#fff", maxHeight: "80vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#F5970A" }}
            >
              {isSpeaking ? (
                <HufiVoiceWave color="#FFFFFF" barCount={4} height={16} />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <p className="font-bold text-sm leading-none" style={{ color: "#1A1A1A" }}>Hufi</p>
              {isSpeaking && (
                <p className="text-[10px] mt-0.5" style={{ color: "#F5970A" }}>spricht …</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSupported && (
              <button
                onClick={() => speak(payload.text)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Wiederholen"
              >
                <Volume2 className="w-4 h-4" style={{ color: "#9CA3AF" }} />
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" style={{ color: "#9CA3AF" }} />
            </button>
          </div>
        </div>

        {/* Briefing lines */}
        <div className="space-y-2.5 mb-6">
          {payload.lines.map((line, i) => (
            <p
              key={i}
              className="text-base leading-relaxed"
              style={{ color: i === 0 ? "#111827" : "#4B5563", fontWeight: i === 0 ? 600 : 400 }}
            >
              {line}
            </p>
          ))}
        </div>

        {/* Quick actions */}
        {payload.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {payload.actions.map((action) => (
              <button
                key={action.route}
                onClick={() => handleAction(action.route)}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-colors active:scale-95"
                style={{
                  backgroundColor: "rgba(245,151,10,0.1)",
                  color: "#F5970A",
                  border: "1px solid rgba(245,151,10,0.25)",
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
