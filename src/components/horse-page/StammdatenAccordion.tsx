import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Horse } from "@/components/horse-detail/types";
import { HOLDING_TYPE_OPTIONS, USAGE_TYPE_OPTIONS, HOOF_PROTECTION_OPTIONS } from "@/components/horse-detail/types";

interface StammdatenAccordionProps {
  horse: Horse;
}

interface AccordionItem {
  title: string;
  rows: { label: string; value: string | null | undefined }[];
}

export function StammdatenAccordion({ horse }: StammdatenAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;
  const genderLabel = horse.gender === "gelding" ? "Wallach" :
    horse.gender === "mare" ? "Stute" :
    horse.gender === "stallion" ? "Hengst" : horse.gender;
  const holdingType = HOLDING_TYPE_OPTIONS.find(h => h.value === horse.holding_type);
  const usageType = USAGE_TYPE_OPTIONS.find(u => u.value === horse.usage_type);
  const hoofProt = HOOF_PROTECTION_OPTIONS.find(p => p.value === horse.hoof_protection);

  const sections: AccordionItem[] = [
    {
      title: "Besitzdaten",
      rows: [
        { label: "Name", value: horse.name },
        { label: "Rufname", value: horse.nickname },
        { label: "Rasse", value: horse.breed },
        { label: "Alter", value: age ? `${age} Jahre` : null },
        { label: "Geschlecht", value: genderLabel },
        { label: "Farbe", value: horse.color },
        { label: "Standort", value: horse.location_name },
      ],
    },
    {
      title: "Haltung & Nutzung",
      rows: [
        { label: "Haltungsform", value: holdingType?.label },
        { label: "Nutzung", value: usageType?.label || horse.usage },
        { label: "Hufschutz", value: hoofProt?.label || "Barhuf" },
        { label: "Beschlagintervall", value: horse.shoeing_interval ? `${horse.shoeing_interval} Wochen` : null },
        { label: "Fütterung", value: horse.feeding_notes },
      ],
    },
    {
      title: "Kontakt & Vertrag",
      rows: [
        { label: "Tierarzt", value: horse.contacts?.vet },
        { label: "TA Telefon", value: horse.contacts?.vet_phone },
        { label: "Trainer", value: horse.contacts?.trainer },
        { label: "Stall", value: horse.contacts?.stable },
        { label: "Chip-Nr.", value: horse.chip_number },
      ],
    },
  ];

  return (
    <div className="px-4">
      <div className="hp-section-header">
        <span className="hp-section-title">Stammdaten</span>
      </div>

      <div className="flex flex-col gap-2">
        {sections.map((section, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={section.title}
              className="rounded-lg overflow-hidden"
              style={{ background: "var(--hp-bg2)", border: "0.5px solid var(--hp-border)" }}
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--hp-bg3)] transition-colors"
                aria-expanded={isOpen}
                role="button"
              >
                <span className="text-[13px] font-medium text-[var(--hp-text2)]">{section.title}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[var(--hp-text3)] transition-transform duration-[250ms] ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div className={`hp-accordion-body ${isOpen ? "open" : ""}`}>
                <div className="px-4 pb-1">
                  {section.rows
                    .filter((r) => r.value)
                    .map((row) => (
                      <div
                        key={row.label}
                        className="flex justify-between py-2"
                        style={{ borderBottom: "0.5px solid var(--hp-border)" }}
                      >
                        <span className="text-[12px] text-[var(--hp-text3)]">{row.label}</span>
                        <span className="text-[12px] text-[var(--hp-text2)]">{row.value}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
