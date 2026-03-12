import { Calendar, Camera, FileText } from "lucide-react";

interface HorseDetailStatsProps {
  appointmentsCount: number;
  hoofPhotosCount: number;
  documentsCount: number;
}

export function HorseDetailStats({ appointmentsCount, hoofPhotosCount, documentsCount }: HorseDetailStatsProps) {
  const stats = [
    { icon: Calendar, value: appointmentsCount, label: "Termine", color: "text-primary" },
    { icon: Camera, value: hoofPhotosCount, label: "Huffotos", color: "text-primary" },
    { icon: FileText, value: documentsCount, label: "Dokumente", color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 -mt-4 relative z-10 px-1">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-3 text-center shadow-lg"
        >
          <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
          <p className="text-xl font-bold text-foreground">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
