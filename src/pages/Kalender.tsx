import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const daysOfWeek = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const appointments = [
  { id: 1, day: 2, time: "09:00", customer: "Anna Schmidt", horse: "Bella", type: "Barhuf" },
  { id: 2, day: 2, time: "14:00", customer: "Thomas Müller", horse: "Storm", type: "Beschlag" },
  { id: 3, day: 4, time: "10:30", customer: "Maria Weber", horse: "Luna", type: "Korrektur" },
  { id: 4, day: 5, time: "09:00", customer: "Stefan Braun", horse: "Max", type: "Barhuf" },
  { id: 5, day: 5, time: "15:00", customer: "Julia Hoffmann", horse: "Sternchen", type: "Beschlag" },
];

const typeColors: Record<string, string> = {
  Barhuf: "bg-accent text-accent-foreground",
  Beschlag: "bg-primary text-primary-foreground",
  Korrektur: "bg-amber-500 text-white",
};

const Kalender = () => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Generate week days
  const getWeekDays = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + currentWeek * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return {
        dayName: daysOfWeek[i],
        dayNumber: date.getDate(),
        month: date.toLocaleDateString("de-DE", { month: "short" }),
        isToday: date.toDateString() === today.toDateString(),
        dayIndex: i + 1,
      };
    });
  };

  const weekDays = getWeekDays();

  const getAppointmentsForDay = (dayIndex: number) => {
    return appointments.filter((apt) => apt.day === dayIndex);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalender</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Termine und Besuche
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Neuer Termin
        </Button>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek((w) => w - 1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg">
              {currentWeek === 0
                ? "Diese Woche"
                : currentWeek === 1
                ? "Nächste Woche"
                : currentWeek === -1
                ? "Letzte Woche"
                : `KW ${new Date().getWeek() + currentWeek}`}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek((w) => w + 1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayAppointments = getAppointmentsForDay(day.dayIndex);
              const isSelected = selectedDay === day.dayIndex;

              return (
                <div
                  key={day.dayIndex}
                  onClick={() => setSelectedDay(day.dayIndex)}
                  className={cn(
                    "p-3 rounded-xl cursor-pointer transition-all min-h-[120px]",
                    day.isToday && "ring-2 ring-primary",
                    isSelected
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 hover:bg-muted/50",
                    "border border-transparent"
                  )}
                >
                  <div className="text-center mb-2">
                    <p className="text-xs text-muted-foreground font-medium">{day.dayName}</p>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        day.isToday ? "text-primary" : "text-foreground"
                      )}
                    >
                      {day.dayNumber}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          "text-xs p-1.5 rounded-md truncate",
                          typeColors[apt.type]
                        )}
                      >
                        {apt.time} {apt.horse}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{dayAppointments.length - 2} mehr
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail */}
      {selectedDay && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-lg">
              Termine am {weekDays[selectedDay - 1]?.dayNumber}. {weekDays[selectedDay - 1]?.month}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {getAppointmentsForDay(selectedDay).length > 0 ? (
              getAppointmentsForDay(selectedDay).map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{apt.horse}</h4>
                        <Badge className={cn("text-xs", typeColors[apt.type])}>{apt.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {apt.customer}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {apt.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Keine Termine an diesem Tag
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Helper to get week number
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function () {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export default Kalender;
