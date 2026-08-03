import { HufiHorseCard } from "./HufiHorseCard";
import type { MockHorseOption } from "./HufiAssistantState";

interface HufiChoiceCardsProps {
  options: MockHorseOption[];
  onSelect: (option: MockHorseOption) => void;
}

// Immer einspaltig gestapelt (kein Nebeneinander) — dadurch auf 360px
// Breite ohne Media-Query sicher vollständig sichtbar und erreichbar.
export function HufiChoiceCards({ options, onSelect }: HufiChoiceCardsProps) {
  return (
    <div role="group" aria-label="Pferd auswählen" style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {options.map((option) => (
        <HufiHorseCard
          key={option.id}
          name={option.name}
          owner={option.owner}
          place={option.place}
          lastAppointment={option.lastAppointment}
          onSelect={() => onSelect(option)}
        />
      ))}
    </div>
  );
}
