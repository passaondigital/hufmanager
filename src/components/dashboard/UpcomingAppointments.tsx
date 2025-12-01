import { Calendar, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const appointments = [
  {
    id: 1,
    customer: "Anna Schmidt",
    horse: "Bella",
    time: "09:00",
    date: "Heute",
    location: "Hof Sonnenschein",
    type: "Barhuf",
  },
  {
    id: 2,
    customer: "Thomas Müller",
    horse: "Storm",
    time: "11:30",
    date: "Heute",
    location: "Reitstall Waldblick",
    type: "Beschlag",
  },
  {
    id: 3,
    customer: "Maria Weber",
    horse: "Luna",
    time: "14:00",
    date: "Morgen",
    location: "Privat",
    type: "Korrektur",
  },
  {
    id: 4,
    customer: "Stefan Braun",
    horse: "Max",
    time: "10:00",
    date: "Mo, 16.12.",
    location: "Reiterhof Bergmann",
    type: "Barhuf",
  },
];

const typeColors: Record<string, string> = {
  Barhuf: "bg-accent/10 text-accent",
  Beschlag: "bg-primary/10 text-primary",
  Korrektur: "bg-amber-500/10 text-amber-600",
};

export function UpcomingAppointments() {
  return (
    <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Kommende Termine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.map((apt, index) => (
          <div
            key={apt.id}
            className="p-4 rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-foreground">{apt.horse}</p>
                <p className="text-sm text-muted-foreground">{apt.customer}</p>
              </div>
              <span className={cn("px-2 py-1 rounded-md text-xs font-medium", typeColors[apt.type])}>
                {apt.type}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {apt.date}, {apt.time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {apt.location}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
