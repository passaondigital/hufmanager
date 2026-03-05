import { useState, useEffect, useRef, useMemo } from "react";
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
  Image as ImageIcon,
  Camera
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

const appointmentSchema = z.object({
  horseId: z.string().min(1, "Bitte wählen Sie ein Pferd aus"),
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
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState("none");
  const [customWeeks, setCustomWeeks] = useState(4);
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: "" });

  const [formData, setFormData] = useState({
    horseId: "",
    time: "09:00",
    serviceType: "Barhuf",
    notes: "",
    location: "",
    duration: 60,
    isSeriesAppointment: false,
    seriesCurrent: 1,
    seriesTotal: 5,
  });

  // Fetch provider's profession_type
  const { data: providerSettings } = useQuery({
    queryKey: ["provider-profession", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("profession_type")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000,
  });

  const professionType = (providerSettings as any)?.profession_type || "hoof_care";

  // Fetch service time presets for this profession
  const { presets: servicePresets } = useServicePresets(professionType);

  // Build a preset map for quick lookup
  const presetMap = useMemo(() => {
    const map: Record<string, typeof servicePresets[0]> = {};
    servicePresets.forEach(p => { map[p.service_type] = p; });
    return map;
  }, [servicePresets]);

  // Fetch services with billing_type
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Get current service billing type
  const currentService = services.find((s: any) => s.name === formData.serviceType);
  const isFlatRate = currentService?.billing_type === "flat_rate";
  const isSeriesService = currentService?.billing_type === "series";

  // Fetch horses with owner price_group
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

  // Fetch service price overrides for the current service
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

  // Check for conflicts
  const checkForConflicts = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const existingAtTime = existingAppointments.filter(
      (apt) => apt.date === dateStr && apt.time === time
    );
    
    if (existingAtTime.length > 0) {
      const horseNames = existingAtTime
        .map((apt) => apt.horses?.name || "Unbekannt")
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

  // Pre-select horse when passed from calendar
  useEffect(() => {
    if (preselectedHorseId && isOpen) {
      setFormData(prev => ({ ...prev, horseId: preselectedHorseId }));
    }
  }, [preselectedHorseId, isOpen]);

  // Create appointment mutation - with proper error handling and sequential flow
  const createAppointments = useMutation({
    networkMode: "always",
    onMutate: (appointments: any[]) => {
      console.log("[AppointmentFormModal] mutate", {
        online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
        appointmentsCount: appointments?.length,
        evidenceCount: pendingEvidence.length,
      });
    },
    mutationFn: async (appointments: any[]) => {
      console.log("[AppointmentFormModal] mutationFn start");
      // Start upload progress tracking immediately if we have evidence
      if (pendingEvidence.length > 0) {
        setIsUploading(true);
        setUploadProgress({ current: 0, total: pendingEvidence.length, fileName: "Termin wird erstellt..." });
      }
      
      try {
        // Step A: Create the appointment records first
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

        console.log("[AppointmentFormModal] createdAppointments", createdAppointments);

        // Step B: Get the first appointment ID for evidence linking
        const firstAppointment = createdAppointments[0];
        
        // Step C: Upload and link evidence files BEFORE returning
        if (pendingEvidence.length > 0 && firstAppointment) {
          const totalFiles = pendingEvidence.length;
          
          for (let i = 0; i < pendingEvidence.length; i++) {
            const evidence = pendingEvidence[i];
            setUploadProgress({ current: i + 1, total: totalFiles, fileName: evidence.file.name });
            
            const fileExt = evidence.file.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `evidence/${formData.horseId}/${fileName}`;

            let fileType = "document";
            if (evidence.file.type.startsWith("image/")) fileType = "image";
            else if (evidence.file.type.startsWith("video/")) fileType = "video";
            else if (evidence.file.type === "application/pdf") fileType = "pdf";

            // Upload file to storage
            const uploadResult = await uploadFile("horse-documents", filePath, evidence.file);
            if (uploadResult.error) {
              console.error("Upload error:", uploadResult.error);
              throw new Error(`Datei-Upload fehlgeschlagen: ${uploadResult.error.message || "Unbekannter Fehler"}`);
            }

            // Insert media_asset record with appointment_id
            // Validate captureDate before parsing
            const capturedAtDate = evidence.captureDate && !isNaN(Date.parse(evidence.captureDate))
              ? new Date(evidence.captureDate).toISOString()
              : new Date().toISOString();
              
            const { error: assetError } = await supabase.from("media_assets").insert({
              horse_id: formData.horseId,
              appointment_id: firstAppointment.id,
              file_url: filePath,
              file_type: fileType,
              category: evidence.category,
              captured_at: capturedAtDate,
              title: evidence.file.name.split('.')[0],
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
        // Always reset upload state, regardless of success or failure
        setIsUploading(false);
        setUploadProgress({ current: 0, total: 0, fileName: "" });
      }
    },
    onSuccess: (createdAppointments) => {
      // Clean up file previews
      pendingEvidence.forEach(item => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["horse-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["media-assets-for-visits"] });
      queryClient.invalidateQueries({ queryKey: ["visit-evidence"] });
      queryClient.invalidateQueries({ queryKey: ["recent-horses"] });

      // Step D: Show success toast and close modal
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
    // Error handling happens in handleSubmit (mutateAsync catch)
  });

  const resetForm = () => {
    setFormData({
      horseId: "",
      time: "09:00",
      serviceType: "Barhuf",
      notes: "",
      location: "",
      duration: 60,
      isSeriesAppointment: false,
      seriesCurrent: 1,
      seriesTotal: 5,
    });
    setRecurrence("none");
    setCustomWeeks(4);
    setConflictWarning(null);
    setPendingEvidence([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedDate) return;

    const newEvidence: PendingEvidence[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith("image/");
      newEvidence.push({
        id: crypto.randomUUID(),
        file,
        category: "chat", // Default category
        captureDate: format(selectedDate, "yyyy-MM-dd"), // Default to visit date
        preview: isImage ? URL.createObjectURL(file) : undefined,
      });
    }
    
    setPendingEvidence(prev => [...prev, ...newEvidence]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateEvidenceCategory = (id: string, category: string) => {
    setPendingEvidence(prev => 
      prev.map(e => e.id === id ? { ...e, category } : e)
    );
  };

  const updateEvidenceDate = (id: string, captureDate: string) => {
    setPendingEvidence(prev => 
      prev.map(e => e.id === id ? { ...e, captureDate } : e)
    );
  };

  const removeEvidence = (id: string) => {
    setPendingEvidence(prev => {
      const item = prev.find(e => e.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter(e => e.id !== id);
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
    console.log("[AppointmentFormModal] handleSubmit click", {
      selectedDate,
      horseId: formData.horseId,
      evidenceCount: pendingEvidence.length,
      online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
    });

    if (!selectedDate || !user?.id) {
      toast({
        title: "Fehler",
        description: "Bitte melden Sie sich erneut an.",
        variant: "destructive",
      });
      return;
    }

    const validationResult = appointmentSchema.safeParse({
      horseId: formData.horseId,
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
    
    // Check if date is in the past - if so, auto-complete the appointment
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointments: any[] = [];
    const recurringGroupId = recurrence !== "none" ? crypto.randomUUID() : null;

    // Calculate number of occurrences (12 months worth)
    const weeksInterval = recurrence === "custom" ? customWeeks : (recurrence === "none" ? 1 : parseInt(recurrence) || 4);
    const occurrences = recurrence === "none" ? 1 : Math.floor(52 / weeksInterval) || 1;

    for (let i = 0; i < occurrences; i++) {
      const appointmentDate = addWeeks(selectedDate, i * weeksInterval);
      
      // Check if this specific occurrence is in the past
      const occurrenceIsPast = appointmentDate < today;
      
      // Resolve price group override
      const selectedHorse = horses.find((h: any) => h.id === validated.horseId);
      const ownerPriceGroup = selectedHorse?.owner?.price_group || "standard";
      const override = priceOverrides.find((o: any) => o.price_group === ownerPriceGroup);
      const resolvedPrice = isFlatRate ? 0 : (override ? override.price : (currentService?.base_price || 0));
      const appliedGroup = override ? ownerPriceGroup : (ownerPriceGroup !== "standard" ? ownerPriceGroup : null);

      appointments.push({
        horse_id: validated.horseId,
        date: format(appointmentDate, "yyyy-MM-dd"),
        time: validated.time,
        service_type: validated.serviceType,
        notes: validated.notes || "",
        location: validated.location || "",
        duration: validated.duration,
        provider_id: user.id,
        recurring_group_id: recurringGroupId,
        // Price group resolution
        price: resolvedPrice,
        applied_price: resolvedPrice,
        price_group_applied: appliedGroup,
        is_internally_paid: isFlatRate,
        // Series appointment tracking
        is_series_appointment: formData.isSeriesAppointment || isSeriesService,
        series_current: (formData.isSeriesAppointment || isSeriesService) ? formData.seriesCurrent + i : null,
        series_total: (formData.isSeriesAppointment || isSeriesService) ? formData.seriesTotal : null,
        // Auto-complete past appointments (Time Travel feature)
        status: visitStatusLabelToDbStatus(occurrenceIsPast ? "Erledigt" : "Geplant"),
        completed_at: occurrenceIsPast ? new Date().toISOString() : null,
      });
    }

    console.log("[AppointmentFormModal] submitting appointments", {
      count: appointments.length,
      first: appointments[0],
    });

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

  const isPastDate = selectedDate ? selectedDate < new Date(new Date().setHours(0, 0, 0, 0)) : false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        {/* Upload Progress Overlay */}
        {isUploading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
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
                <p className="text-sm text-muted-foreground truncate max-w-[280px]">
                  {uploadProgress.fileName}
                </p>
              </div>
              <div className="w-full max-w-[280px] h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
        
        <DialogHeader>
          <DialogTitle>Neuer Termin</DialogTitle>
          <DialogDescription>
            {selectedDate ? (
              <span className="flex items-center gap-2">
                Termin für {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
                {isPastDate && (
                  <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">
                    Vergangenes Datum → Status: Erledigt
                  </span>
                )}
              </span>
            ) : (
              "Wählen Sie ein Datum im Kalender"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {conflictWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{conflictWarning}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Pferd auswählen *</Label>
            <Select
              value={formData.horseId}
              onValueChange={(value) => setFormData({ ...formData, horseId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pferd auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {horses.map((horse) => (
                  <SelectItem key={horse.id} value={horse.id}>
                    {horse.name} ({horse.breed || "Unbekannt"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Price group warning */}
            {formData.horseId && (() => {
              const h = horses.find((ho: any) => ho.id === formData.horseId);
              const pg = h?.owner?.price_group;
              if (!pg || pg === "standard") {
                return (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    Kunde hat keine Preisgruppe → Basispreis wird verwendet
                  </p>
                );
              }
              const override = priceOverrides.find((o: any) => o.price_group === pg);
              return (
                <p className="text-xs text-muted-foreground mt-1">
                  Preisgruppe: <span className="font-medium">{pg.toUpperCase()}</span>
                  {override ? ` → €${override.price}` : " (kein Override → Basispreis)"}
                </p>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Uhrzeit *</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dauer (Min.)</Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
              >
                <SelectTrigger>
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
            <Label>Service-Typ *</Label>
            <Select
              value={formData.serviceType}
              onValueChange={(value) => {
                const preset = presetMap[value];
                setFormData(prev => ({
                  ...prev,
                  serviceType: value,
                  duration: preset?.estimated_minutes || prev.duration,
                }));
              }}
            >
              <SelectTrigger>
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
                            <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: preset.color_hex }} />
                          )}
                          {service.name}
                          {preset && <span className="text-muted-foreground text-xs">({preset.estimated_minutes} Min.)</span>}
                          {service.billing_type === "flat_rate" && " (Pauschal)"}
                          {service.billing_type === "series" && " (Serie)"}
                        </span>
                      </SelectItem>
                    );
                  })
                ) : (
                  servicePresets.length > 0 ? (
                    servicePresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.service_type}>
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: preset.color_hex }} />
                          {preset.service_type}
                          <span className="text-muted-foreground text-xs">({preset.estimated_minutes} Min.)</span>
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
                  )
                )}
              </SelectContent>
            </Select>
            
            {isFlatRate && (
              <p className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 p-2 rounded">
                💡 Pauschal-Service: Preis wird auf 0,00€ gesetzt, aber als "intern bezahlt" markiert.
              </p>
            )}
          </div>

          {/* Evidence Upload Section (Arsch-Retter) */}
          <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-primary">
                <Upload className="h-4 w-4" />
                Beweise & Dokumente
              </Label>
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
              <div className="flex gap-1.5">
                <Button 
                  type="button" 
                  size="sm" 
                  variant="default"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={!formData.horseId}
                  className="gap-1"
                >
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Foto</span>
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!formData.horseId}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Datei
                </Button>
              </div>
            </div>
            
            {!formData.horseId && (
              <p className="text-xs text-muted-foreground">
                Bitte zuerst ein Pferd auswählen
              </p>
            )}

            {pendingEvidence.length > 0 && (
              <div className="space-y-2">
                {pendingEvidence.map((evidence) => {
                  const category = EVIDENCE_CATEGORIES.find(c => c.value === evidence.category) || EVIDENCE_CATEGORIES[0];
                  const isImage = evidence.file.type.startsWith("image/");
                  
                  return (
                    <div key={evidence.id} className="p-2 bg-background rounded-lg border space-y-2">
                      <div className="flex items-start gap-2">
                        {/* Preview */}
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {isImage && evidence.preview ? (
                            <img src={evidence.preview} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{evidence.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(evidence.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        
                        {/* Remove button */}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removeEvidence(evidence.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Category & Date */}
                      <div className="flex gap-2">
                        <Select 
                          value={evidence.category} 
                          onValueChange={(val) => updateEvidenceCategory(evidence.id, val)}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <div className="flex items-center gap-1.5">
                              <div className={cn("h-4 w-4 rounded-full flex items-center justify-center", category.color)}>
                                <category.icon className="h-2.5 w-2.5 text-white" />
                              </div>
                              <span>{category.label}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {EVIDENCE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                <div className="flex items-center gap-2">
                                  <div className={cn("h-4 w-4 rounded-full flex items-center justify-center", cat.color)}>
                                    <cat.icon className="h-2.5 w-2.5 text-white" />
                                  </div>
                                  {cat.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Input
                          type="date"
                          value={evidence.captureDate}
                          onChange={(e) => updateEvidenceDate(evidence.id, e.target.value)}
                          className="h-8 text-xs w-[130px]"
                          title="Aufnahmedatum"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {pendingEvidence.length === 0 && formData.horseId && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Chat-Screenshots, Fotos vom Zustand, Befunde...
              </p>
            )}
          </div>

          {/* Series Appointment Section */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <Checkbox
                id="seriesAppointment"
                checked={formData.isSeriesAppointment || isSeriesService}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, isSeriesAppointment: checked as boolean })
                }
                disabled={isSeriesService}
              />
              <Label htmlFor="seriesAppointment" className="flex items-center gap-2 cursor-pointer">
                <Package className="h-4 w-4" />
                Serien-Termin (Teil eines Pakets)
              </Label>
            </div>
            
            {(formData.isSeriesAppointment || isSeriesService) && (
              <div className="flex items-center gap-2 ml-6">
                <Label className="text-sm whitespace-nowrap">Termin</Label>
                <Input
                  type="number"
                  min={1}
                  max={formData.seriesTotal}
                  value={formData.seriesCurrent}
                  onChange={(e) => setFormData({ ...formData, seriesCurrent: parseInt(e.target.value) || 1 })}
                  className="w-16"
                />
                <Label className="text-sm">von</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={formData.seriesTotal}
                  onChange={(e) => setFormData({ ...formData, seriesTotal: parseInt(e.target.value) || 5 })}
                  className="w-16"
                />
                <span className="text-xs text-muted-foreground">(erscheint auf der Rechnung)</span>
              </div>
            )}
          </div>

          {/* Recurring Options */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Label className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Wiederholung
            </Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {recurrence === "custom" && (
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-sm whitespace-nowrap">Alle</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={customWeeks}
                  onChange={(e) => setCustomWeeks(parseInt(e.target.value) || 4)}
                  className="w-20"
                />
                <Label className="text-sm">Wochen</Label>
              </div>
            )}
            
            {recurrence !== "none" && (
              <p className="text-xs text-muted-foreground mt-2">
                Es werden automatisch Termine für die nächsten 12 Monate erstellt.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Ort</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="z.B. Reitstall Sonnenhof"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label>Notizen</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Zusätzliche Informationen..."
              maxLength={2000}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createAppointments.isPending || isUploading}
          >
            {(createAppointments.isPending || isUploading) ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {recurrence !== "none" ? "Termine erstellen" : "Speichern"}
            {pendingEvidence.length > 0 && ` (${pendingEvidence.length} Beweise)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}