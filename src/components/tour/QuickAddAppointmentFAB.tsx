import { useState } from "react";
import { Plus, AlertTriangle, Calendar, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface QuickAddAppointmentFABProps {
  tourDate: Date;
  onAppointmentAdded?: () => void;
  currentAppointmentCount: number;
}

export function QuickAddAppointmentFAB({
  tourDate,
  onAppointmentAdded,
  currentAppointmentCount,
}: QuickAddAppointmentFABProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    horseId: "",
    time: format(new Date(), "HH:mm"),
    serviceType: "Notfall",
    notes: "",
    isEmergency: true,
  });

  // Fetch horses for quick selection
  const { data: horses = [] } = useQuery({
    queryKey: ["horses-quick-add"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horses")
        .select(`
          id,
          name,
          breed,
          owner:profiles!horses_owner_id_fkey(full_name)
        `)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ["services-quick-add"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("name")
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const filteredHorses = horses.filter((horse) => {
    const search = searchTerm.toLowerCase();
    return (
      horse.name.toLowerCase().includes(search) ||
      horse.owner?.full_name?.toLowerCase().includes(search)
    );
  });

  const handleSubmit = async () => {
    if (!user || !formData.horseId) {
      toast.error("Bitte wählen Sie ein Pferd aus");
      return;
    }

    setIsSubmitting(true);

    try {
      const dateStr = format(tourDate, "yyyy-MM-dd");

      // Create the appointment
      const { error } = await supabase.from("appointments").insert({
        horse_id: formData.horseId,
        provider_id: user.id,
        date: dateStr,
        time: formData.time,
        service_type: formData.serviceType,
        notes: formData.notes,
        status: "scheduled",
        is_emergency: formData.isEmergency,
        added_during_tour: true,
        tour_order: currentAppointmentCount + 1,
      });

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-map"] });

      toast.success("Termin zur Tour hinzugefügt");
      
      setIsOpen(false);
      setFormData({
        horseId: "",
        time: format(new Date(), "HH:mm"),
        serviceType: "Notfall",
        notes: "",
        isEmergency: true,
      });
      setSearchTerm("");
      
      onAppointmentAdded?.();
    } catch (error) {
      console.error("Error adding appointment:", error);
      toast.error("Fehler beim Hinzufügen des Termins");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 p-0"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Termin zur Tour hinzufügen
          </SheetTitle>
          <SheetDescription>
            Schnell einen spontanen Termin während der Tour erfassen
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          {/* Horse Search */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Pferd suchen
            </Label>
            <Input
              placeholder="Name des Pferdes oder Besitzers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-base"
            />

            {/* Horse List */}
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
              {filteredHorses.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Keine Pferde gefunden
                </p>
              ) : (
                filteredHorses.map((horse) => (
                  <div
                    key={horse.id}
                    className={cn(
                      "p-3 cursor-pointer border-b border-border last:border-0 transition-colors",
                      formData.horseId === horse.id
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    )}
                    onClick={() => setFormData({ ...formData, horseId: horse.id })}
                  >
                    <p className="font-medium">🐴 {horse.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {horse.owner?.full_name || "Unbekannter Besitzer"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label>Uhrzeit</Label>
            <Input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="text-base"
            />
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <Label>Service-Typ</Label>
            <Select
              value={formData.serviceType}
              onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Notfall">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Notfall
                  </span>
                </SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.name} value={service.name}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Emergency Toggle */}
          <div
            className={cn(
              "p-4 rounded-lg border-2 cursor-pointer transition-colors",
              formData.isEmergency
                ? "border-destructive bg-destructive/10"
                : "border-border"
            )}
            onClick={() => setFormData({ ...formData, isEmergency: !formData.isEmergency })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  formData.isEmergency ? "text-destructive" : "text-muted-foreground"
                )} />
                <span className="font-medium">Als Notfall markieren</span>
              </div>
              <Badge variant={formData.isEmergency ? "destructive" : "outline"}>
                {formData.isEmergency ? "Notfall" : "Normal"}
              </Badge>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notizen (optional)</Label>
            <Textarea
              placeholder="Kurze Beschreibung des Notfalls..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.horseId}
          >
            {isSubmitting ? (
              "Wird hinzugefügt..."
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Termin hinzufügen
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
