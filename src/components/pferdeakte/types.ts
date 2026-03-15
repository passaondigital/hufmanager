export type PferdeakteUserRole = "provider" | "client" | "partner" | "employee";

export interface TimelineItem {
  id: string;
  type: "huf" | "vet_vaccination" | "vet_deworming" | "vet_check" | "therapy" | "owner_note" | "owner_health" | "document";
  date: string;
  title: string;
  description: string;
  personName: string;
  personRole: string;
  photos?: string[];
  edid?: string;
  color: string;
  badgeText: string;
  rawData: any;
}

export interface PferdeakteTab {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
