import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  badge?: string | number;
  linkLabel?: string;
  onLinkClick?: () => void;
}

export function SectionHeader({ title, badge, linkLabel, onLinkClick }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {badge !== undefined && (
          <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
            {badge}
          </span>
        )}
      </div>
      {linkLabel && onLinkClick && (
        <button onClick={onLinkClick} className="flex items-center gap-0.5 text-xs text-primary hover:underline">
          {linkLabel}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
