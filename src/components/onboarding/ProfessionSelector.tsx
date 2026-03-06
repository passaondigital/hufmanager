import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HelpTip } from "@/components/ui/HelpTip";

interface ProfessionOption {
  value: string;
  label: string;
  emoji: string;
  description: string;
}

const PROFESSIONS: ProfessionOption[] = [
  { value: "hoof_care", label: "Hufbearbeiter", emoji: "🐴", description: "Barhuf, Beschlag, Kleben" },
  { value: "osteopath", label: "Osteopath", emoji: "🦴", description: "Pferdeosteopathie" },
  { value: "physiotherapist", label: "Physiotherapeut", emoji: "💆", description: "Pferdephysiotherapie" },
  { value: "dentist", label: "Equine Dentist", emoji: "🦷", description: "Pferdezahnbehandlung" },
  { value: "riding_instructor", label: "Reitlehrer", emoji: "🏇", description: "Reitunterricht & Beritt" },
  { value: "saddler", label: "Sattler", emoji: "🪡", description: "Sattelanpassung & Reparatur" },
  { value: "massage", label: "Massage", emoji: "💬", description: "Pferdemassage & Wellness" },
  { value: "vet_mobile", label: "Mobiler Tierarzt", emoji: "🩺", description: "Veterinärmedizin vor Ort" },
  { value: "other", label: "Sonstiges", emoji: "⚙️", description: "Andere mobile Dienstleistung" },
];

interface ProfessionSelectorProps {
  userId: string;
  onComplete: () => void;
}

export function ProfessionSelector({ userId, onComplete }: ProfessionSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!selected) return;
    setIsSaving(true);

    try {
      // 1. Save to profiles
      await supabase
        .from("profiles")
        .update({ profession_type: selected } as any)
        .eq("id", userId);

      // 2. Save to business_settings (upsert)
      const { data: existing } = await supabase
        .from("business_settings")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("business_settings")
          .update({ profession_type: selected } as any)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("business_settings")
          .insert({ user_id: userId, profession_type: selected } as any);
      }

      // 3. Create default service presets via DB function
      await supabase.rpc("create_default_service_presets", {
        _provider_id: userId,
        _profession_type: selected,
      });

      toast({ title: "Berufsgruppe gespeichert", description: "Deine Service-Presets wurden angelegt." });
      onComplete();
    } catch (error) {
      console.error("Error saving profession:", error);
      toast({ title: "Fehler", description: "Berufsgruppe konnte nicht gespeichert werden.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
          Was ist dein Beruf?
          <HelpTip id="onboarding.profession-type" />
        </h2>
        <p className="text-muted-foreground">
          Wir passen Service-Typen, Zeitpuffer und Kalenderfarben an deinen Beruf an.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PROFESSIONS.map((p, i) => (
          <motion.button
            key={p.value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setSelected(p.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
              selected === p.value
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <span className="text-2xl">{p.emoji}</span>
            <span className="text-xs font-medium text-foreground leading-tight">{p.label}</span>
          </motion.button>
        ))}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-3">
            {PROFESSIONS.find(p => p.value === selected)?.description}
          </p>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="min-w-[160px]"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Weiter
          </Button>
        </motion.div>
      )}
    </div>
  );
}
