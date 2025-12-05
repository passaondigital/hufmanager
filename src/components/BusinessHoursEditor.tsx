import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Clock, Moon } from "lucide-react";

interface DayHours {
  enabled: boolean;
  start: string;
  end: string;
}

interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface BusinessHoursEditorProps {
  value: BusinessHours;
  onChange: (hours: BusinessHours) => void;
}

const dayLabels: Record<keyof BusinessHours, string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag",
};

const defaultHours: BusinessHours = {
  monday: { enabled: true, start: "08:00", end: "18:00" },
  tuesday: { enabled: true, start: "08:00", end: "18:00" },
  wednesday: { enabled: true, start: "08:00", end: "18:00" },
  thursday: { enabled: true, start: "08:00", end: "18:00" },
  friday: { enabled: true, start: "08:00", end: "18:00" },
  saturday: { enabled: false, start: "09:00", end: "14:00" },
  sunday: { enabled: false, start: "09:00", end: "12:00" },
};

export const BusinessHoursEditor = ({ value, onChange }: BusinessHoursEditorProps) => {
  const hours = value || defaultHours;

  const updateDay = (day: keyof BusinessHours, field: keyof DayHours, val: boolean | string) => {
    onChange({
      ...hours,
      [day]: {
        ...hours[day],
        [field]: val,
      },
    });
  };

  const isCurrentlyWorking = () => {
    const now = new Date();
    const dayNames: (keyof BusinessHours)[] = [
      "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
    ];
    const currentDay = dayNames[now.getDay()];
    const dayConfig = hours[currentDay];
    
    if (!dayConfig?.enabled) return false;
    
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTime >= dayConfig.start && currentTime <= dayConfig.end;
  };

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      <div className={`flex items-center gap-3 p-4 rounded-lg ${isCurrentlyWorking() ? 'bg-accent/10' : 'bg-muted/50'}`}>
        {isCurrentlyWorking() ? (
          <>
            <Clock className="h-5 w-5 text-accent" />
            <div>
              <p className="font-medium text-foreground">Aktuell erreichbar</p>
              <p className="text-sm text-muted-foreground">Nachrichten werden sofort zugestellt</p>
            </div>
          </>
        ) : (
          <>
            <Moon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Feierabend-Modus aktiv</p>
              <p className="text-sm text-muted-foreground">Nachrichten werden zurückgehalten</p>
            </div>
          </>
        )}
      </div>

      {/* Hours editor */}
      <div className="space-y-3">
        {(Object.keys(dayLabels) as (keyof BusinessHours)[]).map((day) => (
          <div
            key={day}
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              hours[day]?.enabled ? 'bg-card' : 'bg-muted/30'
            }`}
          >
            <Switch
              checked={hours[day]?.enabled ?? false}
              onCheckedChange={(checked) => updateDay(day, "enabled", checked)}
            />
            <span className="w-24 font-medium text-foreground">{dayLabels[day]}</span>
            
            {hours[day]?.enabled ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={hours[day]?.start || "08:00"}
                  onChange={(e) => updateDay(day, "start", e.target.value)}
                  className="w-28"
                />
                <span className="text-muted-foreground">bis</span>
                <Input
                  type="time"
                  value={hours[day]?.end || "18:00"}
                  onChange={(e) => updateDay(day, "end", e.target.value)}
                  className="w-28"
                />
              </div>
            ) : (
              <span className="text-muted-foreground italic">Nicht verfügbar</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        <Moon className="h-4 w-4 inline mr-1" />
        Außerhalb der Arbeitszeiten erhalten Kunden eine automatische Antwort und Sie werden nicht gestört.
      </p>
    </div>
  );
};

export { defaultHours };
export type { BusinessHours, DayHours };
