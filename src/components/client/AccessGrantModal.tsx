import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, ArrowRight, ArrowLeft, HelpCircle, CalendarIcon, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
  onGranted: () => void;
}

interface FoundProfile {
  id: string;
  full_name: string;
  readable_id: string | null;
  avatar_url: string | null;
}

const PARTNER_TYPES = [
  { value: "partner", label: "Tierarzt", icon: "🩺" },
  { value: "hoof_care", label: "Hufbearbeiter", icon: "🔨" },
  { value: "farrier", label: "Hufschmied", icon: "⚒️" },
  { value: "physio", label: "Physiotherapeut", icon: "🖐️" },
  { value: "osteo", label: "Osteopath", icon: "🖐️" },
  { value: "saddler", label: "Sattler", icon: "🐴" },
  { value: "trainer", label: "Trainer", icon: "🏇" },
  { value: "other", label: "Sonstige", icon: "👤" },
];

interface PermissionDef {
  key: string;
  label: string;
  tooltip: string;
  group: string;
}

const PERMISSIONS: PermissionDef[] = [
  { key: "can_view_medical", label: "Gesundheitsakte & Vorerkrankungen", tooltip: "Vorerkrankungen, Diagnosen, Medikamente", group: "Gesundheit" },
  { key: "can_view_vaccinations", label: "Impfpass & Impfhistorie", tooltip: "Alle eingetragenen Impfungen mit Datum und Impfstoff", group: "Gesundheit" },
  { key: "can_view_deworming", label: "Entwurmungsprotokoll", tooltip: "Entwurmungshistorie mit Wirkstoffen und Kotproben", group: "Gesundheit" },
  { key: "can_view_weight_bcs", label: "Gewicht & Körperkondition (BCS)", tooltip: "Gewichtsverlauf und Body Condition Score", group: "Gesundheit" },
  { key: "can_view_documents", label: "Dokumente ansehen", tooltip: "Alle hochgeladenen Dokumente wie Röntgenbilder und Befunde", group: "Dokumente" },
  { key: "can_upload_documents", label: "Dokumente hochladen", tooltip: "Die Person kann neue Dokumente zum Pferd hinzufügen", group: "Dokumente" },
  { key: "can_view_diary", label: "Tagebuch ansehen", tooltip: "Einträge im Pferdetagebuch lesen", group: "Termine & Notizen" },
  { key: "can_view_breeding", label: "Abstammung & Zuchtdaten", tooltip: "Vater, Mutter, Zuchtbuch und Herkunftsland", group: "Erweitert" },
  { key: "can_view_insurance", label: "Versicherungsdaten", tooltip: "Versicherer, Vertragsnummer, Versicherungsart", group: "Erweitert" },
  { key: "can_view_training", label: "Ausbildung & Ausrüstung", tooltip: "Ausbildungsstand, Disziplinen, Sattelmaße", group: "Erweitert" },
];

export function AccessGrantModal({ open, onClose, horseId, horseName, onGranted }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FoundProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<FoundProfile | null>(null);
  const [selectedType, setSelectedType] = useState("partner");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [validUntil, setValidUntil] = useState<Date | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const resetState = () => {
    setStep(1);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedProfile(null);
    setSelectedType("partner");
    setPermissions({});
    setValidUntil(undefined);
    setSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const cleanQuery = searchQuery.trim().replace("#", "");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, readable_id, avatar_url")
        .is("deleted_at", null)
        .or(`full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,readable_id.ilike.%${cleanQuery}%`)
        .neq("id", user?.id || "")
        .limit(10);

      if (error) throw error;
      setSearchResults((data || []) as FoundProfile[]);
    } catch (err: any) {
      console.error(err);
      toast.error("Fehler bei der Suche");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectProfile = (profile: FoundProfile) => {
    setSelectedProfile(profile);
  };

  const goToStep2 = () => {
    if (!selectedProfile) {
      toast.error("Bitte wähle eine Person aus");
      return;
    }
    setStep(2);
  };

  const goToStep3 = () => {
    const anyPermission = Object.values(permissions).some(Boolean);
    if (!anyPermission) {
      toast.error("Bitte wähle mindestens eine Berechtigung aus");
      return;
    }
    setStep(3);
  };

  const handleConfirm = async () => {
    if (!user || !selectedProfile) return;
    setSubmitting(true);
    try {
      // Build insert object
      const insertData: Record<string, any> = {
        horse_id: horseId,
        partner_profile_id: selectedProfile.id,
        partner_type: selectedType,
        is_active: true,
        status: "active",
        granted_at: new Date().toISOString(),
        granted_by: user.id,
        can_view_medical: permissions.can_view_medical || false,
        can_view_vaccinations: permissions.can_view_vaccinations || false,
        can_view_deworming: permissions.can_view_deworming || false,
        can_view_weight_bcs: permissions.can_view_weight_bcs || false,
        can_view_documents: permissions.can_view_documents || false,
        can_upload_documents: permissions.can_upload_documents || false,
        can_view_diary: permissions.can_view_diary || false,
        can_view_breeding: permissions.can_view_breeding || false,
        can_view_insurance: permissions.can_view_insurance || false,
        can_view_training: permissions.can_view_training || false,
      };
      if (validUntil) {
        insertData.valid_until = format(validUntil, "yyyy-MM-dd");
      }

      const { error } = await supabase
        .from("horse_partner_access")
        .insert(insertData as any);

      if (error) throw error;

      // Audit log
      const grantedPerms = Object.entries(permissions)
        .filter(([, v]) => v)
        .map(([k]) => PERMISSIONS.find((p) => p.key === k)?.label || k);

      await supabase.from("horse_audit_log").insert({
        horse_id: horseId,
        actor_id: user.id,
        action_type: "grant_access",
        action_detail: {
          partner_name: selectedProfile.full_name,
          partner_id: selectedProfile.id,
          permissions: grantedPerms,
        },
      });

      // Get owner name for notification
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      // Notification to partner
      await supabase.from("notifications").insert({
        user_id: selectedProfile.id,
        title: "Neuer Zugriff erteilt",
        message: `🐴 ${ownerProfile?.full_name || "Ein Pferdebesitzer"} hat dir Zugriff auf ${horseName} freigegeben. Freigegebene Bereiche: ${grantedPerms.join(", ")}`,
        type: "access_granted",
        link: "/partner-dashboard",
      });

      toast.success(`Zugriff für ${selectedProfile.full_name} erteilt`);
      onGranted();
      handleClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Fehler beim Gewähren des Zugriffs");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPermsLabels = Object.entries(permissions)
    .filter(([, v]) => v)
    .map(([k]) => PERMISSIONS.find((p) => p.key === k)?.label || k);

  const groupedPermissions = PERMISSIONS.reduce<Record<string, PermissionDef[]>>((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Wen möchtest du freischalten?"}
            {step === 2 && `Was darf ${selectedProfile?.full_name} sehen?`}
            {step === 3 && "Bitte bestätigen"}
          </DialogTitle>
        </DialogHeader>

        <TooltipProvider>
          {/* STEP 1: Search person + select role */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex gap-2">
                <Input
                  placeholder="Name, E-Mail oder #PRID suchen…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button size="icon" onClick={handleSearch} disabled={searching}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors ${
                        selectedProfile?.id === p.id ? "bg-primary/10" : ""
                      }`}
                      onClick={() => handleSelectProfile(p)}
                    >
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} className="h-8 w-8 rounded-full object-cover" alt="" />
                        ) : (
                          (p.full_name || "?")[0]
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.full_name || "Unbekannt"}</p>
                        {p.readable_id && (
                          <p className="text-xs text-muted-foreground">#{p.readable_id}</p>
                        )}
                      </div>
                      {selectedProfile?.id === p.id && (
                        <Check className="h-4 w-4 text-primary ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                <p className="text-sm text-muted-foreground text-center py-3">Keine Ergebnisse</p>
              )}

              {/* Role selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Rolle auswählen</Label>
                <RadioGroup value={selectedType} onValueChange={setSelectedType} className="grid grid-cols-2 gap-2">
                  {PARTNER_TYPES.map((t) => (
                    <div key={t.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={t.value} id={`role-${t.value}`} />
                      <Label htmlFor={`role-${t.value}`} className="text-sm cursor-pointer">
                        {t.icon} {t.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Button className="w-full gap-2" onClick={goToStep2} disabled={!selectedProfile}>
                Weiter <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2: Permissions */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Always granted */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-1">Grunddaten</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked disabled />
                  <span>Steckbrief & Stammdaten</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>Name, Rasse, Farbe, Größe, Chip-Nummer</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Permission groups */}
              {Object.entries(groupedPermissions).map(([group, perms]) => (
                <div key={group} className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{group}</p>
                  {perms.map((p) => (
                    <div key={p.key} className="flex items-center gap-2">
                      <Checkbox
                        id={p.key}
                        checked={permissions[p.key] || false}
                        onCheckedChange={(checked) =>
                          setPermissions((prev) => ({ ...prev, [p.key]: !!checked }))
                        }
                      />
                      <Label htmlFor={p.key} className="text-sm cursor-pointer flex-1">
                        {p.label}
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">{p.tooltip}</TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              ))}

              {/* Optional expiry */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm">Zeitlich begrenzen? (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validUntil ? format(validUntil, "dd.MM.yyyy", { locale: de }) : "Kein Ablaufdatum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={validUntil}
                      onSelect={setValidUntil}
                      disabled={(date) => date < new Date()}
                      locale={de}
                    />
                  </PopoverContent>
                </Popover>
                {validUntil && (
                  <Button variant="ghost" size="sm" onClick={() => setValidUntil(undefined)}>
                    Ablaufdatum entfernen
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" /> Zurück
                </Button>
                <Button className="flex-1 gap-2" onClick={goToStep3}>
                  Weiter <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p>
                      Du gibst <strong>{selectedProfile?.full_name}</strong> (
                      {PARTNER_TYPES.find((t) => t.value === selectedType)?.label || selectedType})
                      Zugriff auf folgende Daten von <strong>{horseName}</strong>:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-foreground/80">
                      <li>Steckbrief & Stammdaten</li>
                      {selectedPermsLabels.map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                    {validUntil && (
                      <p className="text-amber-700 dark:text-amber-400">
                        Befristet bis: {format(validUntil, "dd.MM.yyyy", { locale: de })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Du kannst diesen Zugriff jederzeit widerrufen. HufManager übernimmt keine Haftung
                für die Verwendung der Daten durch den Empfänger.
              </p>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Zurück</Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleConfirm}
                  disabled={submitting}
                >
                  <Check className="h-4 w-4" />
                  {submitting ? "Wird gespeichert…" : "Freigabe bestätigen"}
                </Button>
              </div>
            </div>
          )}
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
