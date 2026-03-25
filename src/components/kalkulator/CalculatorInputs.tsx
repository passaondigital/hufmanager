import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, MapPin, Calendar } from "lucide-react";

interface CalculatorInputsProps {
  horses: number;
  setHorses: (n: number) => void;
  zone: 1 | 2;
  setZone: (z: 1 | 2) => void;
  intervalWeeks: number;
  setIntervalWeeks: (w: number) => void;
}

export function CalculatorInputs({
  horses, setHorses,
  zone, setZone,
  intervalWeeks, setIntervalWeeks,
}: CalculatorInputsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {/* Anzahl Pferde */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-[#F47B20]" />
          Anzahl Pferde
        </Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[horses]}
            onValueChange={(v) => setHorses(v[0])}
            min={1}
            max={6}
            step={1}
            className="flex-1"
          />
          <span className="text-2xl font-bold min-w-[2ch] text-center">{horses}</span>
        </div>
      </div>

      {/* Entfernung */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-[#F47B20]" />
          Entfernung zum Stall
        </Label>
        <Select value={String(zone)} onValueChange={(v) => setZone(Number(v) as 1 | 2)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Bis 25 km (10 € Anfahrt)</SelectItem>
            <SelectItem value="2">25–50 km (20 € Anfahrt)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Intervall */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4 text-[#F47B20]" />
          Intervall
        </Label>
        <Select value={String(intervalWeeks)} onValueChange={(v) => setIntervalWeeks(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4">Alle 4 Wochen</SelectItem>
            <SelectItem value="6">Alle 6 Wochen (empfohlen)</SelectItem>
            <SelectItem value="8">Alle 8 Wochen</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
