import {
  Stethoscope,
  Activity,
  Hand,
  Zap,
  Trophy,
  Target,
  Scissors,
  Footprints,
  Smile,
  Leaf,
  Users,
} from "lucide-react";

export type PartnerTypeKey =
  | "tierarzt"
  | "physiotherapeut"
  | "osteopath"
  | "chiropraktiker"
  | "reitlehrer"
  | "trainer"
  | "sattler"
  | "huforthopaedie"
  | "zahnarzt"
  | "ernaehrungsberater"
  | "other";

export interface PartnerTypeConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const PARTNER_TYPE_CONFIG: Record<PartnerTypeKey, PartnerTypeConfig> = {
  tierarzt: { label: "Tierarzt", icon: Stethoscope, color: "text-blue-500" },
  physiotherapeut: { label: "Physiotherapeut", icon: Activity, color: "text-green-500" },
  osteopath: { label: "Osteopath", icon: Hand, color: "text-purple-500" },
  chiropraktiker: { label: "Chiropraktiker", icon: Zap, color: "text-orange-500" },
  reitlehrer: { label: "Reitlehrer", icon: Trophy, color: "text-yellow-500" },
  trainer: { label: "Trainer", icon: Target, color: "text-red-500" },
  sattler: { label: "Sattler", icon: Scissors, color: "text-amber-500" },
  huforthopaedie: { label: "Huforthopädie", icon: Footprints, color: "text-teal-500" },
  zahnarzt: { label: "Zahnarzt", icon: Smile, color: "text-pink-500" },
  ernaehrungsberater: { label: "Ernährungsberater", icon: Leaf, color: "text-lime-500" },
  other: { label: "Sonstige", icon: Users, color: "text-muted-foreground" },
};

export const PARTNER_TYPE_OPTIONS = Object.entries(PARTNER_TYPE_CONFIG).map(
  ([key, config]) => ({
    value: key as PartnerTypeKey,
    label: config.label,
    icon: config.icon,
    color: config.color,
  })
);

export function getPartnerTypeConfig(type: string | null | undefined): PartnerTypeConfig {
  if (!type || !(type in PARTNER_TYPE_CONFIG)) {
    return PARTNER_TYPE_CONFIG.other;
  }
  return PARTNER_TYPE_CONFIG[type as PartnerTypeKey];
}
