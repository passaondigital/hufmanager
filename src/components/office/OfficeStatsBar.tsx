import { FileText, FileDown, CheckCircle2, Blocks } from "lucide-react";

interface OfficeStatsBarProps {
  stats: {
    total: number;
    pdfs: number;
    completed: number;
    avgBlocks: number;
  };
}

export function OfficeStatsBar({ stats }: OfficeStatsBarProps) {
  const items = [
    { icon: FileText, label: "Dokumente", value: stats.total },
    { icon: FileDown, label: "PDFs", value: stats.pdfs },
    { icon: CheckCircle2, label: "Fertig", value: stats.completed },
    { icon: Blocks, label: "Ø Bausteine", value: stats.avgBlocks },
  ];

  return (
    <div className="flex gap-4 flex-wrap">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{item.value}</span>
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
