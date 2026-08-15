import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Loader2,
  CalendarClock,
  Package,
  Upload,
  X,
  MessageSquare,
  AlertCircle,
  Stethoscope,
  MoreHorizontal,
  FileText,
  Camera,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { addWeeks, format } from "date-fns";
import { de } from "date-fns/locale";
import { uploadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useServicePresets } from "@/hooks/useServicePresets";
import { useProfessionConfig } from "@/hooks/useProfessionConfig";
import { sendTypedPush, resolveProviderDisplayName } from "@/lib/pushNotificationService";
import { HelpTip } from "@/components/ui/HelpTip";

const appointmentSchema = z.object({
  horseIds: z.array(z.string()).min(1, "Bitte wählen Sie mindestens ein Pferd aus"),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Ungültiges Zeitformat"),
  serviceType: z.string().min(1, "Bitte wählen Sie einen Service-Typ"),
  notes: z.string().max(2000, "Notizen dürfen maximal 2000 Zeichen haben").optional(),
  location: z.string().max(255, "Ort darf maximal 255 Zeichen haben").optional(),
  duration: z.number().min(15).max(480),
});

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  existingAppointments: any[];
  preselectedHorseId?: string | null;
}

interface PendingEvidence {
  id: string;
  file: File;
  category: string;
  captureDate: string;
  preview?: string;
}

const EVIDENCE_CATEGORIES = [
  { value: "chat", label: "Chat-Verlauf", icon: MessageSquare, color: "bg-blue-500" },
  { value: "before", label: "Vorher-Zustand", icon: AlertCircle, color: "bg-orange-500" },
  { value: "xray", label: "Röntgen/Befund", icon: Stethoscope, color: "bg-purple-500" },
  { value: "other", label: "Sonstiges", icon: MoreHorizontal, color: "bg-gray-500" },
];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Einmalig" },
  { value: "4", label: "Alle 4 Wochen" },
  { value: "6", label: "Alle 6 Wochen" },
  { value: "8", label: "Alle 8 Wochen" },
  { value: "custom", label: "Benutzerdefiniert" },
];

export function AppointmentFormModal({
  isOpen,
  onClose,
  selectedDate,
  existingAppointments,
  preselectedHorseId,
}: AppointmentFormModalProps) {
  const { user } = useAuth();
  const professionConfig = useProfessionConfig();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState("none");
  const [customWeeks, setCustomWeeks] = useState(4);
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: "" });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const [selectionMode, setSelectionMode] = useState<"horse" | "owner">("horse");
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");

  const [formData, setFormData] = useState({
    horseIds: [] as string[],
    time: "09:00",
    serviceType: "Barhuf",
    notes: "",
    location: "",
    duration: professionConfig.appointmentDuration,
    isSeriesAppointment: false,
    seriesCurrent: 1,
    seriesTotal: 5,
  });

  const { presets: servicePresets } = useServicePresets();

  const presetMap = useMemo(() => {
    const map: Record<string, typeof servicePresets[0]> = {};
    servicePresets.forEach((preset) => {
      map[preset.service_type] = preset;
    });
    return map;
  }, [servicePresets]);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const currentService = services.find((service: any) => service.name === formData.serviceType);
  const isFlatRate = currentService?.billing_type === "flat_rate";
  const isSeriesService = currentService?.billing_type === "series";

  const { data: horses = [] } = useQuery({
    queryKey: ["horses-with-price-group"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horses")
        .select("*, owner:owner_id (id, price_group)");
      if (error) throw error;
      return data;
    },
  });

  const owners = useMemo(() => {
    const ownerMap = new Map<string, { id: string; horses: typeof horses }>();
    horses.forEach((horse: any) => {
      if (!horse.owner_id) return;
      if (!ownerMap.has(horse.owner_id)) {
        ownerMap.set(horse.owner_id, { id: horse.owner_id, horses: [] });
      }
      ownerMap.get(horse.owner_id)!.horses.push(horse);
    });
    return ownerMap;
  }, [horses]);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-for-appointment"],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("id, full_name").limit(500);
      return data || [];
    },
  });

  const contactMap = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((contact: any) => map.set(contact.id, contact.full_name));
    return map;
  }, [contacts]);

  const filteredHorses = useMemo(() => {
    if (selectionMode === "owner" && selectedOwnerId) {
      return horses.filter((horse: any) => horse.owner_id === selectedOwnerId);
    }
    return horses;
  }, [horses, selectionMode, selectedOwnerId]);

  const firstSelectedHorse = horses.find((horse: any) => formData.horseIds.includes(horse.id));
  const selectedHorseOwnerId = firstSelectedHorse?.owner_id;

  const { data: clientLocations = [] } = useQuery({
    queryKey: ["client-locations", selectedHorseOwnerId, user?.id],
    queryFn: async () => {
      if (!selectedHorseOwnerId || !user?.id) return [];
      const { data } = await supabase
        .from("client_locations")
        .select("*")
        .eq("client_id", selectedHorseOwnerId)
        .eq("provider_id", user.id)
        .order("is_default", { ascending: false });
      return data || [];
    },
    enabled: !!selectedHorseOwnerId && !!user?.id,
  });

  const prevHorseRef = useRef(formData.horseIds.join(","));
  useEffect(() => {
    const key = formData.horseIds.join(",");
    if (key !== prevHorseRef.current) {
      prevHorseRef.current = key;
      const defaultLocation = clientLocations.find((location: any) => location.is_default);
      if (defaultLocation) {
        setFormData((previous) => ({
          ...previous,
          location: defaultLocation.name + (defaultLocation.address ? `, ${defaultLocation.address}` : ""),
        }));
      }
    }
  }, [formData.horseIds, clientLocations]);

  const toggleHorse = useCallback((horseId: string) => {
    setFormData((previous) => ({
      ...previous,
      horseIds: previous.horseIds.includes(horseId)
        ? previous.horseIds.filter((id) => id !== horseId)
        : [...previous.horseIds, horseId],
    }));
  }, []);

  const selectAllOwnerHorses = useCallback((ownerId: string) => {
    const ownerHorses = horses.filter((horse: any) => horse.owner_id === ownerId);
    setFormData((previous) => ({
      ...previous,
      horseIds: [...new Set([...previous.horseIds, ...ownerHorses.map((horse: any) => horse.id)])],
    }));
  }, [horses]);

  const { data: priceOverrides = [] } = useQuery({
    queryKey: ["service-price-overrides", currentService?.id],
    queryFn: async () => {
      if (!currentService?.id) return [];
      const { data, error } = await supabase
        .from("service_price_overrides")
        .select("*")
        .eq("service_id", currentService.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentService?.id,
  });

  const checkForConflicts = (date: Date, time: string) => {
    const dateString = format(date, "yyyy-MM-dd");
    const existingAtTime = existingAppointments.filter(
      (appointment) => appointment.date === dateString && appointment.time === time,
    );

    if (existingAtTime.length > 0) {
      const horseNames = existingAtTime
        .map((appointment) => appointment.horses?.name || "Unbekannt")
        .join(", ");
      setConflictWarning(`Zur gleichen Zeit ist bereits ein Termin geplant: ${horseNames}`);
    } else {
      setConflictWarning(null);
    }
  };

  useEffect(() => {
    if (selectedDate && formData.time) {
      checkForConflicts(selectedDate, formData.time);
    }
  }, [selectedDate, formData.time, existingAppointments]);

  useEffect(() => {
    if (preselectedHorseId && isOpen) {
      setFormData((previous) => ({ ...previous, horseIds: [preselectedHorseId] }));
    }
  }, [preselectedHorseId, isOpen]);

  useEffect(() => {
    if (isSeriesService) {
      setShowAdvancedOptions(true);
    }
  }, [isSeriesService]);

  const createAppointments = useMutation({
    networkMode: "always",
    onMutate: (appointments: any[]) => {
      if (import.meta.env.DEV) {
        console.log("[AppointmentFormModal] mutate", { appointmentsCount: appointments?.length });
      }
    },
    mutationFn: async (appointments: any[]) => {
      if (import.meta.env.DEV) console.log("[AppointmentFormModal] mutationFn start");

      if (pendingEvidence.length > 0) {
        setIsUploading(true);
        setUploadProgress({ current: 0, total: pendingEvidence.length, fileName: "Termin wird erstellt..." });
      }

      try {
        const { data: createdAppointments, error: insertError } = await supabase
          .from("appointments")
          .insert(appointments)
          .select();

        if (insertError) {
          console.error("Appointment insert error:", insertError);
          throw new Error(`Termin konnte nicht erstellt werden: ${insertError.message}`);
        }

        if (!createdAppointments || createdAppointments.length === 0) {
          throw new Error("Keine Termine erstellt - unbekannter Fehler");
        }

        if (import.meta.env.DEV) {
          console.log("[AppointmentFormModal] createdAppointments", createdAppointments.length);
        }

        const firstAppointment = createdAppointments[0];

        if (pendingEvidence.length > 0 && firstAppointment) {
          const totalFiles = pendingEvidence.length;

          for (let index = 0; index < pendingEvidence.length; index += 1) {
            const evidence = pendingEvidence[index];
            setUploadProgress({ current: index + 1, total: totalFiles, fileName: evidence.file.name });

            const fileExtension = evidence.file.name.split(".").pop();
            const fileName = `${crypto.randomUUID()}.${fileExtension}`;
            const filePath = `evidence/${formData.horseIds[0]}/${fileName}`;

            let fileType = "document";
            if (evidence.file.type.startsWith("image/")) fileType = "image";
            else if (evidence.file.type.startsWith("video/")) fileType = "video";
            else if (evidence.file.type === "application/pdf") fileType = "pdf";

            const uploadResult = await uploadFile("horse-documents", filePath, evidence.file);
            if (uploadResult.error) {
              console.error("Upload error:", uploadResult.error);
              throw new Error(`Datei-Upload fehlgeschlagen: ${uploadResult.error.message || "Unbekannter Fehler"}`);
            }

            const capturedAtDate = evidence.captureDate && !Number.isNaN(Date.parse(evidence.captureDate))
              ? new Date(evidence.captureDate).toISOString()
              : new Date().toISOString();

            const { error: assetError } = await supabase.from("media_assets").insert({
              horse_id: formData.horseIds[0],
              appointment_id: firstAppointment.id,
              file_url: filePath,
              file_type: fileType,
              category: evidence.category,
              captured_at: capturedAtDate,
              title: evidence.file.name.split(".")[0],
              uploaded_by: user!.id,
            });

            if (assetError) {
              console.error("Media asset insert error:", assetError);
              throw new Error(`Medien-Verknüpfung fehlgeschlagen: ${assetError.message}`);
            }
          }
        }

        return createdAppointments;
      } finally {
        setIsUploading(false);
        setUploadProgress({ current: 0, total: 0, fileName: "" });
      }
    },
    onSuccess: async (createdAppointments) => {
      pendingEvidence.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["horse-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["media-assets-for-visits"] });
      queryClient.invalidateQueries({ queryKey: ["visit-evidence"] });
      queryClient.invalidateQueries({ queryKey: ["recent-horses"] });

      if (createdAppointments?.length) {
        import("@/lib/geocodeAppointment").then(({ geocodeAppointmentAndSave }) => {
          for (const appointment of createdAppointments) {
            if (!appointment.appointment_lat || !appointment.appointment_lng) {
              geocodeAppointmentAndSave(appointment.id, {
                clientId: appointment.client_id,
                horseId: appointment.horse_id,
                location: appointment.location,
              }).catch(console.error);
            }
          }
        }).catch(console.error);
      }

      if (user?.id && createdAppointments.length > 0) {
        const providerName = await resolveProviderDisplayName(user.id);
        const firstAppointment = createdAppointments[0];

        const { data: horse } = await supabase
          .from("horses")
          .select("owner_id, name")
          .eq("id", firstAppointment.horse_id)
          .maybeSingle();

        if (horse?.owner_id && horse.owner_id !== user.id) {
          const dateString = format(new Date(firstAppointment.date), "dd.MM.yyyy");
          const timeString = firstAppointment.time ? (firstAppointment.time as string).slice(0, 5) : undefined;

          sendTypedPush(horse.owner_id, "appointment_created", {
            providerName,
            horseName: horse.name,
            time: timeString ? `${dateString} um ${timeString}` : dateString,
          }).catch(console.error);
        }
      }

      const count = createdAppointments.length;
      toast({
        title: count > 1 ? `${count} Termine erstellt` : "Termin erstellt",
        description: pendingEvidence.length > 0
          ? `Termin mit ${pendingEvidence.length} Beweis(en) gespeichert.`
          : count > 1
            ? `${count} wiederkehrende Termine wurden gespeichert.`
            : "Der Termin wurde erfolgreich gespeichert.",
      });

      resetForm();
      onClose();
    },
  });

  const resetForm = () => {
    setFormData({
      horseIds: [] as string[],
      time: "09:00",
      serviceType: "Barhuf",
      notes: "",
      location: "",
      duration: professionConfig.appointmentDuration,
      isSeriesAppointment: false,
      seriesCurrent: 1,
      seriesTotal: 5,
    });
    setRecurrence("none");
    setCustomWeeks(4);
    setConflictWarning(null);
    setSelectionMode("horse");
    setSelectedOwnerId("");
    setPendingEvidence([]);
    setShowAdvancedOptions(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedDate) return;

    const newEvidence: PendingEvidence[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const isImage = file.type.startsWith("image/");
      newEvidence.push({
        id: crypto.randomUUID(),
        file,
        category: "chat",
        captureDate: format(selectedDate, "yyyy-MM-dd"),
        preview: isImage ? URL.createObjectURL(file) : undefined,
      });
    }

    setPendingEvidence((previous) => [...previous, ...newEvidence]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const updateEvidenceCategory = (id: string, category: string) => {
    setPendingEvidence((previous) =>
      previous.map((evidence) => evidence.id === id ? { ...evidence, category } : evidence),
    );
  };

  const updateEvidenceDate = (id: string, captureDate: string) => {
    setPendingEvidence((previous) =>
      previous.map((evidence) => evidence.id === id ? { ...evidence, captureDate } : evidence),
    );
  };

  const removeEvidence = (id: string) => {
    setPendingEvidence((previous) => {
      const item = previous.find((evidence) => evidence.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return previous.filter((evidence) => evidence.id !== id);
    });
  };

  const visitStatusLabelToDbStatus = (labelOrValue: string) => {
    const normalized = (labelOrValue || "").trim().toLowerCase();
    if (["erledigt", "completed"].includes(normalized)) return "completed";
    if (["geplant", "planned", "scheduled"].includes(normalized)) return "planned";
    if (["abgesagt", "cancelled", "canceled"].includes(normalized)) return "cancelled";
    return labelOrValue;
  };

  const handleSubmit = () => {
    if (import.meta.env.DEV) console.log("[AppointmentFormModal] handleSubmit click");

    if (!selectedDate || !user?.id) {
      toast({
        title: "Fehler",
        description: "Bitte melden Sie sich erneut an.",
        variant: "destructive",
      });
      return;
    }

    const validationResult = appointmentSchema.safeParse({
      horseIds: formData.horseIds,
      time: formData.time,
      serviceType: formData.serviceType,
      notes: formData.notes || undefined,
      location: formData.location || undefined,
      duration: formData.duration,
    });

    if (!validationResult.success) {
      toast({
        title: "Validierungsfehler",
        description: validationResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const validated = validationResult.data;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointments: any[] = [];
    const recurringGroupId = recurrence !== "none" ? crypto.randomUUID() : null;
    const weeksInterval = recurrence === "custom"
      ? customWeeks
      : (recurrence === "none" ? 1 : parseInt(recurrence, 10) || 4);
    const occurrences = recurrence === "none" ? 1 : Math.floor(52 / weeksInterval) || 1;

    for (const horseId of validated.horseIds) {
      for (let index = 0; index < occurrences; index += 1) {
        const appointmentDate = addWeeks(selectedDate, index * weeksInterval);
        const occurrenceIsPast = appointmentDate < today;
        const selectedHorse = horses.find((horse: any) => horse.id === horseId);
        const ownerPriceGroup = selectedHorse?.owner?.price_group || "standard";
        const override = priceOverrides.find((item: any) => item.price_group === ownerPriceGroup);
        const resolvedPrice = isFlatRate ? 0 : (override ? override.price : (currentService?.base_price || 0));
        const appliedGroup = override ? ownerPriceGroup : (ownerPriceGroup !== "standard" ? ownerPriceGroup : null);

        appointments.push({
          horse_id: horseId,
          client_id: selectedHorse?.owner_id ?? null,
          service_id: currentService?.id ?? null,
          date: format(appointmentDate, "yyyy-MM-dd"),
          time: validated.time,
          service_type: validated.serviceType,
          notes: validated.notes || "",
          location: validated.location || "",
          duration: validated.duration,
          provider_id: user.id,
          recurring_group_id: recurringGroupId,
          price: resolvedPrice,
          applied_price: resolvedPrice,
          price_group_applied: appliedGroup,
          is_internally_paid: isFlatRate,
          is_series_appointment: formData.isSeriesAppointment || isSeriesService,
          series_current: (formData.isSeriesAppointment || isSeriesService) ? formData.seriesCurrent + index : null,
          series_total: (formData.isSeriesAppointment || isSeriesService) ? formData.seriesTotal : null,
          is_multi_horse: validated.horseIds.length > 1,
          status: visitStatusLabelToDbStatus(occurrenceIsPast ? "Erledigt" : "Geplant"),
          completed_at: occurrenceIsPast ? new Date().toISOString() : null,
        });
      }
    }

    if (import.meta.env.DEV) console.log("[AppointmentFormModal] submitting", appointments.length);

    createAppointments
      .mutateAsync(appointments)
      .catch((error: any) => {
        console.error(error);
        const message = error?.message || "Der Termin konnte nicht erstellt werden.";
        toast({
          title: "Fehler beim Speichern",
          description: message,
          variant: "destructive",
        });
        sonnerToast.error(message);
      });
  };

  const isPastDate = selectedDate
    ? selectedDate < new Date(new Date().setHours(0, 0, 0, 0))
    : false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] max-h-[92dvh] overflow-y-auto p-4 sm:max-w-[560px] sm:p-6">
        {isUploading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 p-6 text-center">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  Lade hoch {uploadProgress.current} von {uploadProgress.total}...
                </p>
                <p className="max-w-[280px] truncate text-sm text-muted-foreground">
                  {uploadProgress.fileName}
                </p>
              </div>
              <div className="h-2 w-full max-w-[280px] overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <DialogHeader className="pr-6 text-left">
          <DialogTitle>Neuer Termin</DialogTitle>
          <DialogDescription>
            {selectedDate ? (
              <span className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                <span>Termin für {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}</span>
                {isPastDate && (
                  <span className="w-fit rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600">
                    Vergangenes Datum → Status: Erledigt
                  </span>
                )}
              </span>
            ) : (
              "Wählen Sie ein Datum im Kalender"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 sm:py-4">
          {conflictWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{conflictWarning}</AlertDescription>
            </Alert>
          )}

          <section className="space-y-3 rounded-xl border border-border bg-background p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <Label className="text-sm font-semibold">Kunde / Pferd *</Label>
                <HelpTip
                  title="Kunde oder Pferd"
                  description="Wähle direkt ein Pferd oder zuerst den Kunden/Besitzer. Mehrere Pferde eines Kunden kannst du in einem Schritt auswählen."
                />
              </div>
              <div className="flex overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  className={cn(
                    "px-3 py-2 text-xs font-medium transition-colors",
                    selectionMode === "horse"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                  onClick={() => setSelectionMode("horse")}
                >
                  Pferd
                </button>
                <button
                  type="button"
                  className={cn(
                    "px-3 py-2 text-xs font-medium transition-colors",
                    selectionMode === "owner"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                  onClick={() => setSelectionMode("owner")}
                >
                  Kunde
                </button>
              </div>
            </div>

            {selectionMode === "owner" && (
              <div className="space-y-2">
                <Label className="text-xs">Kunde auswählen</Label>
                <Select
                  value={selectedOwnerId}
                  onValueChange={(value) => {
                    setSelectedOwnerId(value);
                    selectAllOwnerHorses(value);
                  }}
                >
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="Kunde wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(owners.entries()).map(([ownerId, data]) => (
                      <SelectItem key={ownerId} value={ownerId}>
                        {contactMap.get(ownerId) || "Unbekannt"} ({data.horses.length} Pferde)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="max-h-[170px] space-y-1.5 overflow-y-auto rounded-lg border border-border p-2 sm:max-h-[180px]">
              <div className="mb-1 flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">
                  {formData.horseIds.length > 0
                    ? `${formData.horseIds.length} Pferd(e) ausgewählt`
                    : "Pferd(e) auswählen"}
                </Label>
                {filteredHorses.length > 1 && (
                  <button
                    type="button"
                    className="text-[11px] font-medium text-primary hover:underline"
                    onClick={() => {
                      const allIds = filteredHorses.map((horse: any) => horse.id);
                      const allSelected = allIds.every((id) => formData.horseIds.includes(id));
                      setFormData((previous) => ({
                        ...previous,
                        horseIds: allSelected
                          ? previous.horseIds.filter((id) => !allIds.includes(id))
                          : [...new Set([...previous.horseIds, ...allIds])],
                      }));
                    }}
                  >
                    {filteredHorses.every((horse: any) => formData.horseIds.includes(horse.id))
                      ? "Alle abwählen"
                      : "Alle auswählen"}
                  </button>
                )}
              </div>

              {filteredHorses.map((horse: any) => (
                <label
                  key={horse.id}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md p-2 transition-colors",
                    formData.horseIds.includes(horse.id) ? "bg-primary/10" : "hover:bg-muted",
                  )}
                >
                  <Checkbox
                    checked={formData.horseIds.includes(horse.id)}
                    onCheckedChange={() => toggleHorse(horse.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{horse.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground sm:hidden">
                      {selectionMode === "horse" && horse.owner_id && contactMap.get(horse.owner_id)
                        ? contactMap.get(horse.owner_id)
                        : horse.breed || ""}
                    </span>
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {horse.breed || "Unbekannt"}
                  </span>
                  {horse.owner_id && contactMap.get(horse.owner_id) && selectionMode === "horse" && (
                    <span className="ml-auto hidden max-w-[120px] truncate text-[10px] text-muted-foreground sm:inline">
                      {contactMap.get(horse.owner_id)}
                    </span>
                  )}
                </label>
              ))}

              {filteredHorses.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  {selectionMode === "owner" ? "Bitte zuerst einen Kunden wählen" : "Keine Pferde gefunden"}
                </p>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Uhrzeit *</Label>
                <HelpTip
                  title="Uhrzeit"
                  description="Startzeit des Termins. Bei einer Überschneidung zeigt HufManager direkt einen Hinweis."
                />
              </div>
              <Input
                className="min-h-11"
                type="time"
                value={formData.time}
                onChange={(event) => setFormData({ ...formData, time: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Dauer</Label>
                <HelpTip
                  title="Termindauer"
                  description="Die Dauer wird für Kalender und Tourenplanung verwendet. Eine Leistung kann automatisch einen passenden Standardwert setzen."
                />
              </div>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value, 10) })}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Min.</SelectItem>
                  <SelectItem value="45">45 Min.</SelectItem>
                  <SelectItem value="60">1 Stunde</SelectItem>
                  <SelectItem value="90">1,5 Stunden</SelectItem>
                  <SelectItem value="120">2 Stunden</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label>Leistung *</Label>
              <HelpTip
                title="Leistung"
                description="Wähle die Leistung, die bei diesem Termin erbracht wird. Hinterlegte Dauer und Preisregeln werden automatisch übernommen."
              />
            </div>
            <Select
              value={formData.serviceType}
              onValueChange={(value) => {
                const preset = presetMap[value];
                setFormData((previous) => ({
                  ...previous,
                  serviceType: value,
                  duration: preset?.estimated_minutes || previous.duration,
                }));
              }}
            >
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {services.length > 0 ? (
                  services.map((service: any) => {
                    const preset = presetMap[service.name];
                    return (
                      <SelectItem key={service.id} value={service.name}>
                        <span className="flex items-center gap-2">
                          {preset?.color_hex && (
                            <span
                              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                              style={{ background: preset.color_hex }}
                            />
                          )}
                          {service.name}
                          {preset && (
                            <span className="text-xs text-muted-foreground">
                              ({preset.estimated_minutes} Min.)
                            </span>
                          )}
                          {service.billing_type === "flat_rate" && " (Pauschal)"}
                          {service.billing_type === "series" && " (Serie)"}
                        </span>
                      </SelectItem>
                    );
                  })
                ) : servicePresets.length > 0 ? (
                  servicePresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.service_type}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ background: preset.color_hex }}
                        />
                        {preset.service_type}
                        <span className="text-xs text-muted-foreground">
                          ({preset.estimated_minutes} Min.)
                        </span>
                      </span>
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="Barhuf">Barhuf</SelectItem>
                    <SelectItem value="Beschlag">Beschlag</SelectItem>
                    <SelectItem value="Korrektur">Korrektur</SelectItem>
                    <SelectItem value="Notfall">Notfall</SelectItem>
                    <SelectItem value="Kontrolle">Kontrolle</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {isFlatRate && (
              <p className="rounded-lg bg-purple-50 p-2 text-xs text-purple-600 dark:bg-purple-950/20 dark:text-purple-400">
                Pauschal-Service: Der Termin wird mit 0,00 € gespeichert und als intern bezahlt markiert.
              </p>
            )}

            {formData.horseIds.length > 0 && (() => {
              const horse = horses.find((item: any) => item.id === formData.horseIds[0]);
              const priceGroup = horse?.owner?.price_group;
              if (!priceGroup || priceGroup === "standard") return null;
              const override = priceOverrides.find((item: any) => item.price_group === priceGroup);
              return (
                <p className="text-xs text-muted-foreground">
                  Preisgruppe: <span className="font-medium">{priceGroup.toUpperCase()}</span>
                  {override ? ` → €${override.price}` : " → Basispreis"}
                </p>
              );
            })()}
          </div>

          <div className="rounded-xl border border-border bg-muted/20">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions((open) => !open)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left sm:px-4"
              aria-expanded={showAdvancedOptions}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  Mehr Optionen
                  <HelpTip
                    title="Mehr Optionen"
                    description="Ort, Notizen, Wiederholungen, Serien-Termine sowie Fotos und Dokumente brauchst du nur bei Bedarf."
                  />
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  Ort, Wiederholung, Fotos, Dokumente & Notizen
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                  showAdvancedOptions && "rotate-180",
                )}
              />
            </button>

            {showAdvancedOptions && (
              <div className="space-y-4 border-t border-border p-3 sm:p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label>Ort</Label>
                    <HelpTip
                      title="Terminort"
                      description="Wenn ein Kundenstandort hinterlegt ist, kannst du ihn hier auswählen. Der Ort wird auch für Tour und Navigation verwendet."
                    />
                  </div>
                  {clientLocations.length > 0 ? (
                    <Select
                      value={formData.location}
                      onValueChange={(value) => setFormData({ ...formData, location: value })}
                    >
                      <SelectTrigger className="min-h-11">
                        <SelectValue placeholder="Standort wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientLocations.map((location: any) => (
                          <SelectItem
                            key={location.id}
                            value={location.name + (location.address ? `, ${location.address}` : "")}
                          >
                            {location.name}{location.is_default ? " ⭐" : ""}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">✏️ Freitext eingeben</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="min-h-11"
                      value={formData.location}
                      onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                      placeholder="z.B. Reitstall Sonnenhof"
                      maxLength={255}
                    />
                  )}
                  {formData.location === "__custom__" && (
                    <Input
                      className="min-h-11"
                      value=""
                      onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                      placeholder="z.B. Reitstall Sonnenhof"
                      maxLength={255}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Notizen</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                    placeholder="Zusätzliche Informationen..."
                    maxLength={2000}
                    rows={3}
                  />
                </div>

                <div className="space-y-2 rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center gap-1">
                    <Label className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      Wiederholung
                    </Label>
                    <HelpTip
                      title="Termin wiederholen"
                      description="Erstellt die gleiche Terminfolge automatisch für die nächsten 12 Monate. Für einen einzelnen Termin bleibt Einmalig ausgewählt."
                    />
                  </div>
                  <Select value={recurrence} onValueChange={setRecurrence}>
                    <SelectTrigger className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {recurrence === "custom" && (
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 pt-1">
                      <Label className="text-sm">Alle</Label>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={customWeeks}
                        onChange={(event) => setCustomWeeks(parseInt(event.target.value, 10) || 4)}
                      />
                      <Label className="text-sm">Wochen</Label>
                    </div>
                  )}

                  {recurrence !== "none" && (
                    <p className="text-xs text-muted-foreground">
                      Es werden automatisch Termine für die nächsten 12 Monate erstellt.
                    </p>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="seriesAppointment"
                      checked={formData.isSeriesAppointment || isSeriesService}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isSeriesAppointment: checked as boolean })
                      }
                      disabled={isSeriesService}
                    />
                    <Label htmlFor="seriesAppointment" className="flex cursor-pointer items-center gap-2">
                      <Package className="h-4 w-4" />
                      Serien-Termin
                    </Label>
                  </div>

                  {(formData.isSeriesAppointment || isSeriesService) && (
                    <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 sm:max-w-sm">
                      <Label className="text-sm">Termin</Label>
                      <Input
                        type="number"
                        min={1}
                        max={formData.seriesTotal}
                        value={formData.seriesCurrent}
                        onChange={(event) => setFormData({
                          ...formData,
                          seriesCurrent: parseInt(event.target.value, 10) || 1,
                        })}
                      />
                      <Label className="text-sm">von</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={formData.seriesTotal}
                        onChange={(event) => setFormData({
                          ...formData,
                          seriesTotal: parseInt(event.target.value, 10) || 5,
                        })}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1">
                      <Label className="flex items-center gap-2 text-primary">
                        <Upload className="h-4 w-4" />
                        Fotos & Dokumente
                      </Label>
                      <HelpTip
                        title="Fotos und Dokumente"
                        description="Optional: Fotos, Screenshots, Befunde oder andere Unterlagen direkt mit dem Termin und dem Pferd verknüpfen."
                      />
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx"
                      multiple
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={cameraInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                    />
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={formData.horseIds.length === 0}
                        className="gap-1"
                      >
                        <Camera className="h-4 w-4" />
                        Foto
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={formData.horseIds.length === 0}
                      >
                        <Upload className="mr-1 h-4 w-4" />
                        Datei
                      </Button>
                    </div>
                  </div>

                  {formData.horseIds.length === 0 && (
                    <p className="text-xs text-muted-foreground">Bitte zuerst ein Pferd auswählen</p>
                  )}

                  {pendingEvidence.length > 0 && (
                    <div className="space-y-2">
                      {pendingEvidence.map((evidence) => {
                        const category = EVIDENCE_CATEGORIES.find((item) => item.value === evidence.category)
                          || EVIDENCE_CATEGORIES[0];
                        const isImage = evidence.file.type.startsWith("image/");

                        return (
                          <div key={evidence.id} className="space-y-2 rounded-lg border bg-background p-2">
                            <div className="flex items-start gap-2">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                                {isImage && evidence.preview ? (
                                  <img src={evidence.preview} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{evidence.file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(evidence.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0"
                                onClick={() => removeEvidence(evidence.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]">
                              <Select
                                value={evidence.category}
                                onValueChange={(value) => updateEvidenceCategory(evidence.id, value)}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                      "flex h-4 w-4 items-center justify-center rounded-full",
                                      category.color,
                                    )}>
                                      <category.icon className="h-2.5 w-2.5 text-white" />
                                    </div>
                                    <span>{category.label}</span>
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  {EVIDENCE_CATEGORIES.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                      <div className="flex items-center gap-2">
                                        <div className={cn(
                                          "flex h-4 w-4 items-center justify-center rounded-full",
                                          item.color,
                                        )}>
                                          <item.icon className="h-2.5 w-2.5 text-white" />
                                        </div>
                                        {item.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Input
                                type="date"
                                value={evidence.captureDate}
                                onChange={(event) => updateEvidenceDate(evidence.id, event.target.value)}
                                className="h-9 text-xs"
                                title="Aufnahmedatum"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {pendingEvidence.length === 0 && formData.horseIds.length > 0 && (
                    <p className="py-1 text-center text-xs text-muted-foreground">
                      Optional – nur hinzufügen, wenn du etwas dokumentieren möchtest.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 -mx-4 -mb-4 gap-2 border-t border-border bg-background px-4 pb-4 pt-3 sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createAppointments.isPending || isUploading || formData.horseIds.length === 0}
            className="w-full sm:w-auto"
          >
            {(createAppointments.isPending || isUploading) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {formData.horseIds.length > 1
              ? `${formData.horseIds.length} Termine erstellen`
              : recurrence !== "none"
                ? "Termine erstellen"
                : "Termin speichern"}
            {pendingEvidence.length > 0 && ` (${pendingEvidence.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
