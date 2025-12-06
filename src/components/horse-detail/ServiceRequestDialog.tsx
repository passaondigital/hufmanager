import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronRight,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceRequestDialogProps {
  open: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
}

type Step = "problem" | "hoof" | "photo" | "urgency" | "confirm";

const PROBLEMS = [
  { id: "shoe_lost", label: "Eisen verloren", icon: "🔧", urgent: true },
  { id: "lameness", label: "Pferd lahmt", icon: "🦵", urgent: true },
  { id: "hoof_crack", label: "Huf ausgebrochen", icon: "💔", urgent: false },
  { id: "abscess", label: "Hufgeschwür", icon: "🔥", urgent: true },
  { id: "other", label: "Sonstiges", icon: "❓", urgent: false },
];

const HOOVES = [
  { id: "vl", label: "Vorne Links", short: "VL" },
  { id: "vr", label: "Vorne Rechts", short: "VR" },
  { id: "hl", label: "Hinten Links", short: "HL" },
  { id: "hr", label: "Hinten Rechts", short: "HR" },
  { id: "multiple", label: "Mehrere Hufe", short: "M" },
  { id: "unknown", label: "Weiß nicht", short: "?" },
];

const URGENCIES = [
  { 
    id: "high", 
    label: "Hoch", 
    description: "Brauche schnellstmöglich Hilfe",
    color: "text-red-500 bg-red-500/10 border-red-500/30",
  },
  { 
    id: "medium", 
    label: "Mittel", 
    description: "Innerhalb der nächsten Tage",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  },
  { 
    id: "low", 
    label: "Gering", 
    description: "Kann bis zum nächsten Termin warten",
    color: "text-green-500 bg-green-500/10 border-green-500/30",
  },
];

export function ServiceRequestDialog({
  open,
  onClose,
  horseId,
  horseName,
}: ServiceRequestDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<Step>("problem");
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [selectedHoof, setSelectedHoof] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setStep("problem");
    setSelectedProblem(null);
    setSelectedHoof(null);
    setSelectedUrgency(null);
    setPhotoUrl(null);
    setPhotoFile(null);
    setAdditionalNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Ungültiges Format",
        description: "Bitte wähle ein Bild aus.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: "Das Bild darf maximal 10MB groß sein.",
        variant: "destructive",
      });
      return;
    }

    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !user) return null;

    setUploading(true);
    try {
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${horseId}/service-request-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("horse-documents")
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("horse-documents")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedProblem || !selectedHoof || !selectedUrgency) return;

    setSubmitting(true);
    try {
      // Upload photo if present
      let uploadedPhotoUrl = null;
      if (photoFile) {
        uploadedPhotoUrl = await uploadPhoto();
      }

      // Find the provider (get from access_grants)
      const { data: grants } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .limit(1);

      const providerId = grants?.[0]?.provider_id;

      if (!providerId) {
        toast({
          title: "Kein Hufbearbeiter gefunden",
          description: "Du bist noch mit keinem Hufbearbeiter verbunden.",
          variant: "destructive",
        });
        return;
      }

      // Create lead/service request
      const problem = PROBLEMS.find((p) => p.id === selectedProblem);
      const hoof = HOOVES.find((h) => h.id === selectedHoof);
      const urgency = URGENCIES.find((u) => u.id === selectedUrgency);

      const message = [
        `🐴 Pferd: ${horseName}`,
        `❗ Problem: ${problem?.label}`,
        `🦶 Huf: ${hoof?.label}`,
        `⏰ Dringlichkeit: ${urgency?.label}`,
        additionalNotes ? `📝 Notiz: ${additionalNotes}` : "",
        uploadedPhotoUrl ? `📷 Foto angehängt` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const { error } = await supabase.from("leads").insert({
        provider_id: providerId,
        lead_type: selectedUrgency === "high" ? "notfall" : "termin",
        name: user.email,
        message,
        status: "neu",
        source: "app_service_request",
      });

      if (error) throw error;

      toast({
        title: "Anfrage gesendet! ✓",
        description: "Dein Hufbearbeiter wurde benachrichtigt und meldet sich bei dir.",
      });

      handleClose();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Konnte die Anfrage nicht senden.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case "problem":
        return !!selectedProblem;
      case "hoof":
        return !!selectedHoof;
      case "photo":
        return true; // Photo is optional
      case "urgency":
        return !!selectedUrgency;
      default:
        return false;
    }
  };

  const nextStep = () => {
    switch (step) {
      case "problem":
        setStep("hoof");
        break;
      case "hoof":
        setStep("photo");
        break;
      case "photo":
        setStep("urgency");
        break;
      case "urgency":
        setStep("confirm");
        break;
    }
  };

  const prevStep = () => {
    switch (step) {
      case "hoof":
        setStep("problem");
        break;
      case "photo":
        setStep("hoof");
        break;
      case "urgency":
        setStep("photo");
        break;
      case "confirm":
        setStep("urgency");
        break;
    }
  };

  const progress = {
    problem: 20,
    hoof: 40,
    photo: 60,
    urgency: 80,
    confirm: 100,
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Problem melden
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress[step]}%` }}
          />
        </div>

        {/* Step: Problem */}
        {step === "problem" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Was ist passiert?</p>
            <div className="grid grid-cols-2 gap-2">
              {PROBLEMS.map((problem) => (
                <button
                  key={problem.id}
                  onClick={() => setSelectedProblem(problem.id)}
                  className={cn(
                    "p-4 rounded-lg border text-left transition-all",
                    selectedProblem === problem.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl block mb-1">{problem.icon}</span>
                  <span className="text-sm font-medium">{problem.label}</span>
                  {problem.urgent && (
                    <Badge variant="destructive" className="ml-1 text-[10px]">
                      Dringend
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Hoof */}
        {step === "hoof" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Welcher Huf ist betroffen?</p>
            <div className="grid grid-cols-3 gap-2">
              {HOOVES.map((hoof) => (
                <button
                  key={hoof.id}
                  onClick={() => setSelectedHoof(hoof.id)}
                  className={cn(
                    "p-3 rounded-lg border text-center transition-all",
                    selectedHoof === hoof.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-lg font-bold block">{hoof.short}</span>
                  <span className="text-xs text-muted-foreground">{hoof.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Photo */}
        {step === "photo" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Foto hinzufügen <span className="opacity-50">(optional)</span>
            </p>

            {photoUrl ? (
              <div className="relative">
                <img
                  src={photoUrl}
                  alt="Vorschau"
                  className="w-full aspect-video object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setPhotoUrl(null);
                    setPhotoFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Foto aufnehmen</p>
                  <p className="text-xs text-muted-foreground">oder aus Galerie wählen</p>
                </div>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Step: Urgency */}
        {step === "urgency" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Wie dringend ist es?</p>
            <div className="space-y-2">
              {URGENCIES.map((urgency) => (
                <button
                  key={urgency.id}
                  onClick={() => setSelectedUrgency(urgency.id)}
                  className={cn(
                    "w-full p-4 rounded-lg border text-left transition-all",
                    selectedUrgency === urgency.id
                      ? urgency.color + " border-2"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <p className="font-medium">{urgency.label}</p>
                  <p className="text-xs opacity-70">{urgency.description}</p>
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Zusätzliche Hinweise (optional)"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Bitte überprüfe deine Angaben:</p>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pferd:</span>
                <span className="font-medium">{horseName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Problem:</span>
                <span className="font-medium">
                  {PROBLEMS.find((p) => p.id === selectedProblem)?.label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Huf:</span>
                <span className="font-medium">
                  {HOOVES.find((h) => h.id === selectedHoof)?.label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Dringlichkeit:</span>
                <Badge
                  className={cn(
                    URGENCIES.find((u) => u.id === selectedUrgency)?.color
                  )}
                >
                  {URGENCIES.find((u) => u.id === selectedUrgency)?.label}
                </Badge>
              </div>
              {photoUrl && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Foto:</span>
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              )}
            </div>

            {additionalNotes && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Notiz:</p>
                <p className="text-sm">{additionalNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 pt-2">
          {step !== "problem" && (
            <Button variant="outline" onClick={prevStep} className="flex-1">
              Zurück
            </Button>
          )}
          {step !== "confirm" ? (
            <Button onClick={nextStep} disabled={!canProceed()} className="flex-1">
              Weiter
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || uploading}
              className="flex-1"
            >
              {submitting || uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Absenden
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
