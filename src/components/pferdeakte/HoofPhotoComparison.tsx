import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ImageIcon, SlidersHorizontal, Columns2 } from "lucide-react";

interface Props {
  horseId: string;
  open: boolean;
  onClose: () => void;
}

interface AppointmentPhotos {
  date: string;
  appointmentId: string;
  photos: { url: string; position: string; type: "before" | "after" | "general" }[];
}

const POSITION_FILTERS = [
  { value: "all", label: "Alle" },
  { value: "VL", label: "VL" },
  { value: "VR", label: "VR" },
  { value: "HL", label: "HL" },
  { value: "HR", label: "HR" },
  { value: "sole", label: "Sohle" },
];

export function HoofPhotoComparison({ horseId, open, onClose }: Props) {
  const [mode, setMode] = useState<"side-by-side" | "slider">("side-by-side");
  const [positionFilter, setPositionFilter] = useState("all");
  const [selectedPhotoA, setSelectedPhotoA] = useState<string | null>(null);
  const [selectedPhotoB, setSelectedPhotoB] = useState<string | null>(null);
  const [appointmentA, setAppointmentA] = useState<string>("");
  const [appointmentB, setAppointmentB] = useState<string>("");
  const [sliderPosition, setSliderPosition] = useState(50);

  const { data: groupedPhotos, isLoading } = useQuery({
    queryKey: ["hoof-comparison-photos", horseId],
    queryFn: async () => {
      const [hoofPhotosRes, hoofEntriesRes] = await Promise.all([
        supabase
          .from("hoof_photos")
          .select("id, photo_url, hoof_position, taken_at, appointment_id")
          .eq("horse_id", horseId)
          .order("taken_at", { ascending: false }),
        supabase
          .from("hoof_entries")
          .select("id, appointment_id, photo_before_url, photo_after_url, created_at")
          .not("appointment_id", "is", null)
          .order("created_at", { ascending: false }),
      ]);

      // Get appointment dates
      const appointmentIds = new Set<string>();
      hoofPhotosRes.data?.forEach((p: any) => { if (p.appointment_id) appointmentIds.add(p.appointment_id); });
      hoofEntriesRes.data?.forEach((e: any) => { if (e.appointment_id) appointmentIds.add(e.appointment_id); });

      if (appointmentIds.size === 0) return [];

      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, date")
        .eq("horse_id", horseId)
        .in("id", Array.from(appointmentIds))
        .order("date", { ascending: false });

      const dateMap: Record<string, string> = {};
      appointments?.forEach((a: any) => { dateMap[a.id] = a.date; });

      // Group by appointment
      const groupMap: Record<string, AppointmentPhotos> = {};

      hoofPhotosRes.data?.forEach((p: any) => {
        if (!p.appointment_id || !dateMap[p.appointment_id]) return;
        if (!groupMap[p.appointment_id]) {
          groupMap[p.appointment_id] = {
            date: dateMap[p.appointment_id],
            appointmentId: p.appointment_id,
            photos: [],
          };
        }
        groupMap[p.appointment_id].photos.push({
          url: p.photo_url,
          position: p.hoof_position || "general",
          type: "general",
        });
      });

      hoofEntriesRes.data?.forEach((e: any) => {
        if (!e.appointment_id || !dateMap[e.appointment_id]) return;
        if (!groupMap[e.appointment_id]) {
          groupMap[e.appointment_id] = {
            date: dateMap[e.appointment_id],
            appointmentId: e.appointment_id,
            photos: [],
          };
        }
        if (e.photo_before_url) {
          groupMap[e.appointment_id].photos.push({ url: e.photo_before_url, position: "general", type: "before" });
        }
        if (e.photo_after_url) {
          groupMap[e.appointment_id].photos.push({ url: e.photo_after_url, position: "general", type: "after" });
        }
      });

      return Object.values(groupMap).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!horseId && open,
  });

  const appointments = groupedPhotos || [];

  // Auto-select appointments
  if (appointments.length >= 2 && !appointmentA && !appointmentB) {
    setTimeout(() => {
      setAppointmentA(appointments[1]?.appointmentId || "");
      setAppointmentB(appointments[0]?.appointmentId || "");
    }, 0);
  }

  const photosA = appointments.find((a) => a.appointmentId === appointmentA)?.photos || [];
  const photosB = appointments.find((a) => a.appointmentId === appointmentB)?.photos || [];

  const filteredA = positionFilter === "all" ? photosA : photosA.filter((p) => p.position === positionFilter);
  const filteredB = positionFilter === "all" ? photosB : photosB.filter((p) => p.position === positionFilter);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Foto-Vergleich
          </DialogTitle>
        </DialogHeader>

        {appointments.length < 2 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Mindestens 2 Termine mit Fotos benötigt.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Appointment Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Termin A</label>
                <Select value={appointmentA} onValueChange={setAppointmentA}>
                  <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                  <SelectContent>
                    {appointments.map((a) => (
                      <SelectItem key={a.appointmentId} value={a.appointmentId}>
                        {new Date(a.date).toLocaleDateString("de-DE")} ({a.photos.length} Fotos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Termin B</label>
                <Select value={appointmentB} onValueChange={setAppointmentB}>
                  <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                  <SelectContent>
                    {appointments.map((a) => (
                      <SelectItem key={a.appointmentId} value={a.appointmentId}>
                        {new Date(a.date).toLocaleDateString("de-DE")} ({a.photos.length} Fotos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Position Filter + Mode Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex overflow-x-auto gap-1 scrollbar-hide">
                {POSITION_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setPositionFilter(f.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border",
                      positionFilter === f.value
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "text-muted-foreground border-border hover:bg-secondary"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant={mode === "side-by-side" ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMode("side-by-side")}
                >
                  <Columns2 className="h-4 w-4" />
                </Button>
                <Button
                  variant={mode === "slider" ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMode("slider")}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Photo Thumbnails for selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Fotos Termin A</p>
                <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                  {filteredA.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPhotoA(p.url)}
                      className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors",
                        selectedPhotoA === p.url ? "border-primary" : "border-transparent"
                      )}
                    >
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Fotos Termin B</p>
                <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                  {filteredB.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPhotoB(p.url)}
                      className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors",
                        selectedPhotoB === p.url ? "border-primary" : "border-transparent"
                      )}
                    >
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Comparison View */}
            {(selectedPhotoA || filteredA[0]?.url) && (selectedPhotoB || filteredB[0]?.url) ? (
              mode === "side-by-side" ? (
                <SideBySideView
                  imageA={selectedPhotoA || filteredA[0]?.url}
                  imageB={selectedPhotoB || filteredB[0]?.url}
                  dateA={appointments.find((a) => a.appointmentId === appointmentA)?.date}
                  dateB={appointments.find((a) => a.appointmentId === appointmentB)?.date}
                />
              ) : (
                <SliderOverlayView
                  imageA={selectedPhotoA || filteredA[0]?.url}
                  imageB={selectedPhotoB || filteredB[0]?.url}
                  sliderPosition={sliderPosition}
                  onSliderChange={setSliderPosition}
                  dateA={appointments.find((a) => a.appointmentId === appointmentA)?.date}
                  dateB={appointments.find((a) => a.appointmentId === appointmentB)?.date}
                />
              )
            ) : (
              <div className="aspect-square bg-muted rounded-xl flex items-center justify-center text-sm text-muted-foreground">
                Bitte Fotos zum Vergleichen auswählen
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SideBySideView({ imageA, imageB, dateA, dateB }: { imageA: string; imageB: string; dateA?: string; dateB?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <div className="aspect-square rounded-lg overflow-hidden bg-muted">
          <img src={imageA} alt="Termin A" className="w-full h-full object-cover" />
        </div>
        {dateA && <p className="text-xs text-muted-foreground text-center">{new Date(dateA).toLocaleDateString("de-DE")}</p>}
      </div>
      <div className="space-y-1">
        <div className="aspect-square rounded-lg overflow-hidden bg-muted border-2 border-primary">
          <img src={imageB} alt="Termin B" className="w-full h-full object-cover" />
        </div>
        {dateB && <p className="text-xs text-primary text-center font-medium">{new Date(dateB).toLocaleDateString("de-DE")}</p>}
      </div>
    </div>
  );
}

function SliderOverlayView({
  imageA, imageB, sliderPosition, onSliderChange, dateA, dateB
}: {
  imageA: string; imageB: string; sliderPosition: number; onSliderChange: (v: number) => void; dateA?: string; dateB?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInteraction = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onSliderChange(pct);
  }, [onSliderChange]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) handleInteraction(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleInteraction(e.touches[0].clientX);
  };

  return (
    <div className="space-y-1">
      <div
        ref={containerRef}
        className="relative aspect-square w-full overflow-hidden rounded-xl cursor-col-resize select-none"
        onMouseDown={(e) => handleInteraction(e.clientX)}
        onMouseMove={handleMouseMove}
        onTouchStart={(e) => handleInteraction(e.touches[0].clientX)}
        onTouchMove={handleTouchMove}
      >
        {/* Image B (Background - newer) */}
        <img src={imageB} alt="Termin B" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

        {/* Image A (Clipped - older) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPosition}%` }}>
          <img
            src={imageA}
            alt="Termin A"
            className="absolute inset-0 h-full object-cover"
            style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100vw" }}
            draggable={false}
          />
        </div>

        {/* Slider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-lg pointer-events-none"
          style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full shadow-lg border-2 border-primary flex items-center justify-center pointer-events-none">
            <div className="flex gap-px">
              <div className="w-0.5 h-3 bg-primary rounded-full" />
              <div className="w-0.5 h-3 bg-primary rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <span className="absolute top-2 left-2 text-xs font-medium bg-background/80 px-2 py-1 rounded">
          {dateA ? new Date(dateA).toLocaleDateString("de-DE") : "Vorher"}
        </span>
        <span className="absolute top-2 right-2 text-xs font-medium bg-primary text-primary-foreground px-2 py-1 rounded">
          {dateB ? new Date(dateB).toLocaleDateString("de-DE") : "Nachher"}
        </span>
      </div>
    </div>
  );
}

export default HoofPhotoComparison;
