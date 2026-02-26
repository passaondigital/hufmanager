// Central price group definitions
export const PRICE_GROUPS = [
  { value: "standard", label: "Standard", shortLabel: "STD" },
  { value: "vip", label: "VIP", shortLabel: "VIP" },
  { value: "grossstall", label: "Großstall", shortLabel: "GS" },
  { value: "individuell", label: "Individuell", shortLabel: "IND" },
] as const;

export type PriceGroup = typeof PRICE_GROUPS[number]["value"];

export function getPriceGroupLabel(group: string): string {
  return PRICE_GROUPS.find(g => g.value === group)?.label || group;
}

export function getPriceGroupShortLabel(group: string): string {
  return PRICE_GROUPS.find(g => g.value === group)?.shortLabel || group.toUpperCase().slice(0, 3);
}
