import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TileProps {
  icon: ReactNode;
  title: string;
  description: string;
  status?: ReactNode;
  onClick: () => void;
  colSpan?: boolean;
  className?: string;
}

export function Tile({ icon, title, description, status, onClick, colSpan, className }: TileProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "card-tile group relative flex flex-col items-start text-left rounded-2xl border border-border bg-card p-6 transition-all cursor-pointer",
        colSpan && "sm:col-span-2",
        className
      )}
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="flex-1" />
      {status && (
        <div className="text-xs text-muted-foreground mb-3">{status}</div>
      )}
      <span className="card-cta inline-flex items-center gap-1 text-sm font-medium text-primary">
        Öffnen <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

interface TileCategoryProps {
  title: string;
  children: ReactNode;
}

export function TileCategory({ title, children }: TileCategoryProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </section>
  );
}

interface TileHubHeaderProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function TileHubHeader({ icon, title, subtitle }: TileHubHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {title}
      </h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
