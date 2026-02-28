import { Bot } from "lucide-react";

interface AiDisclosureProps {
  /** Short context label, e.g. "Hufanalyse", "AutoFlow" */
  context?: string;
  /** Compact inline mode vs full banner */
  variant?: "inline" | "banner";
  className?: string;
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
        <div>
          <p className="font-medium text-foreground">KI-generierter Inhalt</p>
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
    </span>
  );
}
