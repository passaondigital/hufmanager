import { motion } from "framer-motion";
import { Heart, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientType = "private" | "business";

interface ClientTypeSelectionProps {
  value: ClientType;
  onChange: (v: ClientType) => void;
}

const OPTIONS = [
  {
    id: "private" as const,
    icon: Heart,
    emoji: "🐴",
    title: "Privat",
    desc: "Ich verwalte meine eigenen Pferde.",
    badge: "Kostenlos starten",
  },
  {
    id: "business" as const,
    icon: Building2,
    emoji: "🏠",
    title: "Gewerbe",
    desc: "Ich betreibe einen Stall, eine Pension, Reitschule oder Zuchtgestüt. Ich betreue Pferde die nicht mir gehören.",
    badge: null,
  },
];

export function ClientTypeSelection({ value, onChange }: ClientTypeSelectionProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Wie nutzt du Hufi?</h2>
      </div>
      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left relative",
              value === opt.id
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border hover:border-primary/50"
            )}
          >
            {opt.badge && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {opt.badge}
              </div>
            )}
            <span className="text-3xl mt-0.5">{opt.emoji}</span>
            <div>
              <p className="font-semibold text-foreground text-lg">{opt.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Du bist unsicher? Starte als Privatkunde. Du kannst jederzeit upgraden.
      </p>
    </div>
  );
}
