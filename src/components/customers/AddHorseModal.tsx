import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureUserProfile } from "@/lib/ensureProfile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LocationPicker } from "@/components/LocationPicker";
import { z } from "zod";

const horseSchema = z.object({
  name: z.string().trim().min(1, "Pferdename ist erforderlich").max(100),
  breed: z.string().trim().max(100).optional(),
  birthYear: z
    .string()
    .refine((val) => !val || /^\d{4}$/.test(val), "Geburtsjahr muss 4 Ziffern haben")
    .refine((val) => {
      if (!val) return true;
      const year = parseInt(val);
      const currentYear = new Date().getFullYear();
      return year >= 1970 && year <= currentYear;
    }, "Ungültiges Geburtsjahr")
    .optional(),
});

const EQUINE_TYPES = [
  { value: "horse", label: "Pferd" },
  { value: "pony", label: "Pony" },
  { value: "donkey", label: "Esel" },
  { value: "mule", label: "Maultier" },
  { value: "zebra", label: "Zebra" },
];

interface Props {
  customerId: string | null;
  customerName?: string;
  open: boolean;
  onClose: () => void;
}

export function AddHorseModal({ customerId, customerName, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    equineType: "horse",
    breed: "",
    birthYear: "",
    gender: "",
    color: "",
    notes: "",
    latitude: null as number | null,
    longitude: null as number | null,
    locationName: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      equineType: "horse",
      breed: "",
      birthYear: "",
      gender: "",
      color: "",
      notes: "",
      latitude: null,
      longitude: null,
      locationName: "",
    });
  };

  const createHorse = useMutation({
    mutationFn: async (data: {
      owner_id: string;
      name: string;
      equine_type: string;
      breed?: string;
      birth_year?: number;
      gender?: string;
      color?: string;
      special_notes?: string;
      latitude?: number;
      longitude?: number;
      location_name?: string;
    }) => {
      const { error } = await supabase.from("horses").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["horses"] });
      queryClient.invalidateQueries({ queryKey: ["provider-horses"] });
      toast({
        title: "Pferd angelegt",
        description: `${form.name} wurde erfolgreich erstellt.`,
      });
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Das Pferd konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (!customerId) {
      toast({
        title: "Fehler",
        description: "Kein Kunde ausgewählt.",
        variant: "destructive",
      });
      return;
    }

    // Auto-heal profile if missing (Ghost User fix)
    const { data: { user } } = await supabase.auth.getUser();
    
    // If customerId matches the current user, auto-heal their profile
    if (user && customerId === user.id) {
      const healResult = await ensureUserProfile(user);
      if (!healResult.success) {
        console.error("Failed to auto-heal profile:", healResult.error);
      }
    }
    
    // Validate customerId exists in profiles table before inserting
    const { data: profileExists } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", customerId)
      .maybeSingle();

    if (!profileExists) {
      toast({
        title: "Fehler",
        description: "Der ausgewählte Kunde existiert nicht mehr.",
        variant: "destructive",
      });
      return;
    }

    const result = horseSchema.safeParse({
      name: form.name,
      breed: form.breed || undefined,
      birthYear: form.birthYear || undefined,
    });

    if (!result.success) {
      toast({
        title: "Validierungsfehler",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    createHorse.mutate({
      owner_id: customerId,
      name: result.data.name,
      equine_type: form.equineType,
      breed: result.data.breed || undefined,
      birth_year: result.data.birthYear ? Number(result.data.birthYear) : undefined,
      gender: form.gender || undefined,
      color: form.color || undefined,
      special_notes: form.notes || undefined,
      latitude: form.latitude || undefined,
      longitude: form.longitude || undefined,
      location_name: form.locationName || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neues Pferd anlegen</DialogTitle>
          <DialogDescription>
            {customerName
              ? `Pferd für ${customerName} anlegen`
              : "Neues Pferd einem Kunden zuordnen"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="z.B. Fury"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equineType">Art *</Label>
              <Select
                value={form.equineType}
                onValueChange={(v) => setForm({ ...form, equineType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUINE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="breed">Rasse</Label>
              <Input
                id="breed"
                placeholder="z.B. Hannoveraner"
                value={form.breed}
                onChange={(e) => setForm({ ...form, breed: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthYear">Geburtsjahr</Label>
              <Input
                id="birthYear"
                placeholder="z.B. 2018"
                maxLength={4}
                value={form.birthYear}
                onChange={(e) => setForm({ ...form, birthYear: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Geschlecht</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stallion">Hengst</SelectItem>
                  <SelectItem value="mare">Stute</SelectItem>
                  <SelectItem value="gelding">Wallach</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Farbe</Label>
              <Input
                id="color"
                placeholder="z.B. Rappe"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Standort</Label>
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              locationName={form.locationName}
              onChange={(lat, lng, name) =>
                setForm({ ...form, latitude: lat, longitude: lng, locationName: name || "" })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              placeholder="Besonderheiten, Vorerkrankungen, etc."
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={createHorse.isPending}>
            {createHorse.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Pferd anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
