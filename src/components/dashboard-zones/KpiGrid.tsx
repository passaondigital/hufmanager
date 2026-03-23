import type { LucideIcon } from "lucide-react";
import { KpiCard } from "./KpiCard";

interface KpiItem {
  icon: string | LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
  warning?: boolean;
  onClick?: () => void;
  navigateTo?: string;
  valueClassName?: string;
}

interface KpiGridProps {
  items: KpiItem[];
  columns?: 2 | 3 | 4;
}

export function KpiGrid({ items, columns = 2 }: KpiGridProps) {
  const gridClass =
    columns === 4 ? "grid-cols-2 sm:grid-cols-4" :
    columns === 3 ? "grid-cols-3" :
    "grid-cols-2";

  return (
    <div className={`grid ${gridClass} gap-2`}>
      {items.map((item, i) => (
        <KpiCard key={i} {...item} />
      ))}
    </div>
  );
}
