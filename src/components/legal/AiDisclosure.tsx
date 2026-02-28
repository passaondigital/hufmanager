import { useState } from "react";
import { Bot, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface AiDisclosureProps {
  /** Short context label, e.g. "Hufanalyse", "AutoFlow" */
  context?: string;
  /** Compact inline mode vs full banner */
  variant?: "inline" | "banner";
  className?: string;
}

const CONTEXT_EXPLANATIONS: Record<string, string> = {
  "Hufi": "Hufi analysiert deine Frage und gleicht sie mit hufpflege-spezifischem Fachwissen ab. Die Antworten basieren auf Google Gemini und sind Empfehlungen — keine Diagnosen.",
  "Hufanalyse": "Das Bild wird an Google Gemini übertragen und auf sichtbare Merkmale analysiert. Die KI erkennt Muster, ersetzt aber keine professionelle Einschätzung vor Ort.",
  "HufCam": "Das Bild wird an Google Gemini übertragen und auf sichtbare Merkmale analysiert. Die KI erkennt Muster, ersetzt aber keine professionelle Einschätzung vor Ort.",
  "Belegerfassung": "Das Foto deines Belegs wird per OCR und KI ausgelesen. Erkannte Felder werden vorausgefüllt — bitte immer prüfen bevor du speicherst.",
  "AutoFlow": "Empfehlungen basieren auf deinen bisherigen Termindaten und Mustern. Keine persönlichen Daten werden für KI-Training genutzt.",
  "E-Mail-Entwurf": "Der Text wird von Google Gemini generiert und als Vorschlag angeboten. Bitte vor dem Versand prüfen und bei Bedarf anpassen.",
};

function getExplanation(context?: string): string | null {
  if (!context) return null;
  return CONTEXT_EXPLANATIONS[context] ?? null;
}

function InfoButton({ context }: { context?: string }) {
  const explanation = getExplanation(context);
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!explanation) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Wie funktioniert das?"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-primary" />
              Wie funktioniert das?
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 text-sm text-muted-foreground leading-relaxed">
            {explanation}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Wie funktioniert das?"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-[280px] text-xs leading-relaxed p-3">
        <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary" />
          Wie funktioniert das?
        </p>
        <p className="text-muted-foreground">{explanation}</p>
      </PopoverContent>
    </Popover>
  );
}

/**
 * EU AI Act compliant disclosure component.
 * Marks content as AI-generated per Art. 50 KI-VO (EU 2024/1689).
 * Risk classification: Minimal Risk (no high-risk application).
 */
export function AiDisclosure({ context, variant = "inline", className = "" }: AiDisclosureProps) {
  if (variant === "banner") {
    return (
      <div className={`flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/50 text-xs text-muted-foreground ${className}`}>
        <Bot className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-foreground">KI-generierter Inhalt</p>
            <InfoButton context={context} />
          </div>
          <p>
            {context ? `Dieser ${context}-Inhalt wurde` : "Dieser Inhalt wurde"} mit Unterstützung von KI (Google Gemini) erstellt.
            Alle Ergebnisse sollten von Fachpersonal geprüft werden.
            <span className="block mt-1 opacity-70">
              Hinweis gem. Art. 50 KI-VO (EU 2024/1689) · Risikoklasse: Minimales Risiko
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <Bot className="w-3.5 h-3.5 text-primary" />
      <span>KI-generiert{context ? ` (${context})` : ""} · Art. 50 KI-VO</span>
      <InfoButton context={context} />
    </span>
  );
}
