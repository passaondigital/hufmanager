import { useState, useEffect } from "react";
import type { WidgetContentProps } from "./types";

const QUOTES = [
  { text: "Ein Pferd ist Poesie in Bewegung.", author: "Unbekannt" },
  { text: "Das Glück der Erde liegt auf dem Rücken der Pferde.", author: "Sprichwort" },
  { text: "Wer hart arbeitet, hat Glück.", author: "Unbekannt" },
  { text: "Der beste Zeitpunkt zu handeln ist jetzt.", author: "Unbekannt" },
  { text: "Kleine Schritte führen zu großen Veränderungen.", author: "Unbekannt" },
  { text: "Erfolg ist kein Zufall, sondern das Ergebnis täglicher Entscheidungen.", author: "Unbekannt" },
  { text: "Jeder Huf erzählt eine Geschichte.", author: "Unbekannt" },
];

export default function QuoteContent(_props: WidgetContentProps) {
  const [quote] = useState(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
  });

  return (
    <div className="flex flex-col items-center justify-center py-3 text-center">
      <p className="text-sm italic text-foreground leading-relaxed">"{quote.text}"</p>
      <p className="text-[10px] text-muted-foreground mt-2">— {quote.author}</p>
    </div>
  );
}
