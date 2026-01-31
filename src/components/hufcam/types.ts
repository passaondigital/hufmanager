export type HoofView = "dorsal" | "lateral" | "solar" | "palmar" | "other";

export interface HoofViewConfig {
  id: HoofView;
  label: string;
  icon: string;
  guideType: "t-guide" | "l-guide" | "target-guide" | "none";
  hint: string;
  requiresLevel: boolean;
}

export const HOOF_VIEW_CONFIGS: HoofViewConfig[] = [
  {
    id: "dorsal",
    label: "Vorn",
    icon: "👁️",
    guideType: "t-guide",
    hint: "Bodenlinie bündig mit Boden! Senkrechte mittig durch den Huf.",
    requiresLevel: true,
  },
  {
    id: "lateral",
    label: "Seite",
    icon: "↔️",
    guideType: "l-guide",
    hint: "Handy flach auf den Boden legen! Objektiv auf Hufhöhe.",
    requiresLevel: true,
  },
  {
    id: "solar",
    label: "Sohle",
    icon: "⭕",
    guideType: "target-guide",
    hint: "Strahlspitze genau ins Fadenkreuz.",
    requiresLevel: false,
  },
  {
    id: "palmar",
    label: "Hinten",
    icon: "👁️",
    guideType: "t-guide",
    hint: "Bodenlinie bündig mit Boden! Senkrechte mittig durch den Huf.",
    requiresLevel: true,
  },
  {
    id: "other",
    label: "Sonstiges",
    icon: "📷",
    guideType: "none",
    hint: "Freie Aufnahme ohne Führungslinien.",
    requiresLevel: false,
  },
];
