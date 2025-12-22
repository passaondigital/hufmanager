import { useEffect, useRef, useState } from "react";
import { Horse, HEALTH_STATUS_OPTIONS, HOOF_PROTECTION_OPTIONS, USAGE_OPTIONS, HOUSING_OPTIONS, HoofMeasurements, HorseContacts } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Camera } from "lucide-react";
import { Json } from "@/integrations/supabase/types";
import { uploadFile, getStorageUrl } from "@/lib/storage";

interface EditHorseModalProps {
  horse: Horse;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const buildInitialForm = (h: Horse) => ({
  name: h.name,
  nickname: h.nickname || "",
  breed: h.breed || "",
  birth_year: h.birth_year?.toString() || "",
  gender: h.gender || "",
  color: h.color || "",
  height: h.height || "",
  discipline: h.discipline || "",
  usage: h.usage || "",
  housing: h.housing || "",
  feeding_notes: h.feeding_notes || "",
  health_status: h.health_status || "healthy",
  medical_history: h.medical_history || "",
  hoof_protection: h.hoof_protection || "barefoot",
  shoeing_interval: h.shoeing_interval?.toString() || "6",
  special_notes: h.special_notes || "",
  hoof_vl: (h.hoof_measurements as HoofMeasurements)?.vl || "",
  hoof_vr: (h.hoof_measurements as HoofMeasurements)?.vr || "",
  hoof_hl: (h.hoof_measurements as HoofMeasurements)?.hl || "",
  hoof_hr: (h.hoof_measurements as HoofMeasurements)?.hr || "",
  contact_vet: (h.contacts as HorseContacts)?.vet || "",
  contact_vet_phone: (h.contacts as HorseContacts)?.vet_phone || "",
  contact_trainer: (h.contacts as HorseContacts)?.trainer || "",
  contact_trainer_phone: (h.contacts as HorseContacts)?.trainer_phone || "",
  contact_stable: (h.contacts as HorseContacts)?.stable || "",
  contact_stable_phone: (h.contacts as HorseContacts)?.stable_phone || "",
  contact_caretaker: (h.contacts as HorseContacts)?.caretaker || "",
  contact_caretaker_phone: (h.contacts as HorseContacts)?.caretaker_phone || "",
});

export function EditHorseModal({ horse, open, onClose, onSaved }: EditHorseModalProps) {
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(horse.photo_url || "");
  const [displayPhotoUrl, setDisplayPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(() => buildInitialForm(horse));

  // Pre-fill / refresh when a new horse is opened in the same modal instance
  useEffect(() => {
    setPhotoUrl(horse.photo_url || "");
    setForm(buildInitialForm(horse));
    
    // Load signed URL for display
    const loadPhotoUrl = async () => {
      if (horse.photo_url) {
        const signedUrl = await getStorageUrl('horse-documents', horse.photo_url);
        setDisplayPhotoUrl(signedUrl);
      } else {
        setDisplayPhotoUrl(null);
      }
    };
    loadPhotoUrl();
  }, [horse.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ungültiges Format",
        description: "Bitte wähle ein Bild aus.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: "Das Bild darf maximal 5MB groß sein.",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Use UUID for unpredictable file names
      const filePath = `${horse.id}/profile_${crypto.randomUUID()}.${fileExt}`;

      const { path, error: uploadError } = await uploadFile('horse-documents', filePath, file, { upsert: true });
      if (uploadError || !path) throw uploadError || new Error("Upload failed");

      // Store path, not URL
      setPhotoUrl(path);
      
      // Get signed URL for display
      const signedUrl = await getStorageUrl('horse-documents', path);
      setDisplayPhotoUrl(signedUrl);
      
      toast({ title: "Foto hochgeladen" });
    } catch (error: any) {
      toast({
        title: "Fehler beim Upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name ist erforderlich", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const hoofMeasurements: Json = {
        vl: form.hoof_vl || null,
        vr: form.hoof_vr || null,
        hl: form.hoof_hl || null,
        hr: form.hoof_hr || null,
      };

      const contacts: Json = {
        vet: form.contact_vet || null,
        vet_phone: form.contact_vet_phone || null,
        trainer: form.contact_trainer || null,
        trainer_phone: form.contact_trainer_phone || null,
        stable: form.contact_stable || null,
        stable_phone: form.contact_stable_phone || null,
        caretaker: form.contact_caretaker || null,
        caretaker_phone: form.contact_caretaker_phone || null,
      };

      const { error } = await supabase
        .from('horses')
        .update({
          name: form.name.trim(),
          nickname: form.nickname.trim() || null,
          breed: form.breed.trim() || null,
          birth_year: form.birth_year ? parseInt(form.birth_year) : null,
          gender: form.gender || null,
          color: form.color.trim() || null,
          height: form.height.trim() || null,
          discipline: form.discipline.trim() || null,
          usage: form.usage || null,
          housing: form.housing || null,
          feeding_notes: form.feeding_notes.trim() || null,
          health_status: form.health_status,
          medical_history: form.medical_history.trim() || null,
          hoof_protection: form.hoof_protection,
          shoeing_interval: form.shoeing_interval ? parseInt(form.shoeing_interval) : null,
          special_notes: form.special_notes.trim() || null,
          hoof_measurements: hoofMeasurements,
          contacts: contacts,
          photo_url: photoUrl || null,
        })
        .eq('id', horse.id);

      if (error) throw error;

      toast({ title: "Änderungen gespeichert" });
      onSaved();
      onClose();
    } catch (error: any) {
      toast({
        title: "Fehler beim Speichern",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Pferd bearbeiten</SheetTitle>
        </SheetHeader>
        
        <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3 shrink-0">
            <TabsTrigger value="basic">Basis</TabsTrigger>
            <TabsTrigger value="health">Gesundheit</TabsTrigger>
            <TabsTrigger value="contacts">Kontakte</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="basic" className="mt-0 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {displayPhotoUrl ? (
                    <img src={displayPhotoUrl} alt="Pferd" className="h-full w-full object-cover" />
                  ) : photoUrl ? (
                    <img src={photoUrl} alt="Pferd" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl">🐴</span>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 mr-2" />
                    )}
                    Foto ändern
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name *</Label>
                  <Input 
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Rufname</Label>
                  <Input 
                    value={form.nickname}
                    onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rasse</Label>
                  <Input 
                    value={form.breed}
                    onChange={e => setForm(f => ({ ...f, breed: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Geburtsjahr</Label>
                  <Input 
                    type="number"
                    value={form.birth_year}
                    onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Geschlecht</Label>
                  <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stute">Stute</SelectItem>
                      <SelectItem value="Wallach">Wallach</SelectItem>
                      <SelectItem value="Hengst">Hengst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Farbe</Label>
                  <Input 
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Stockmaß (cm)</Label>
                  <Input 
                    value={form.height}
                    onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Disziplin</Label>
                  <Input 
                    value={form.discipline}
                    onChange={e => setForm(f => ({ ...f, discipline: e.target.value }))}
                    placeholder="z.B. Dressur, Springen"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Verwendung</Label>
                  <Select value={form.usage} onValueChange={v => setForm(f => ({ ...f, usage: v }))}>
                    <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                    <SelectContent>
                      {USAGE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Haltungsform</Label>
                  <Select value={form.housing} onValueChange={v => setForm(f => ({ ...f, housing: v }))}>
                    <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                    <SelectContent>
                      {HOUSING_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Fütterung / Besonderheiten</Label>
                <Textarea 
                  value={form.feeding_notes}
                  onChange={e => setForm(f => ({ ...f, feeding_notes: e.target.value }))}
                  placeholder="z.B. Allergien, spezielle Fütterung..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="health" className="mt-0 space-y-4">
              <div>
                <Label>Gesundheitsstatus</Label>
                <Select value={form.health_status} onValueChange={v => setForm(f => ({ ...f, health_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HEALTH_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Anamnese / Vorgeschichte</Label>
                <Textarea 
                  value={form.medical_history}
                  onChange={e => setForm(f => ({ ...f, medical_history: e.target.value }))}
                  placeholder="Frühere Erkrankungen, OPs, Therapien..."
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hufschutz</Label>
                  <Select value={form.hoof_protection} onValueChange={v => setForm(f => ({ ...f, hoof_protection: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HOOF_PROTECTION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.icon} {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Intervall (Wochen)</Label>
                  <Input 
                    type="number"
                    value={form.shoeing_interval}
                    onChange={e => setForm(f => ({ ...f, shoeing_interval: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <Label>Hufmaße</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Input 
                    placeholder="VL (Vorne Links)"
                    value={form.hoof_vl}
                    onChange={e => setForm(f => ({ ...f, hoof_vl: e.target.value }))}
                  />
                  <Input 
                    placeholder="VR (Vorne Rechts)"
                    value={form.hoof_vr}
                    onChange={e => setForm(f => ({ ...f, hoof_vr: e.target.value }))}
                  />
                  <Input 
                    placeholder="HL (Hinten Links)"
                    value={form.hoof_hl}
                    onChange={e => setForm(f => ({ ...f, hoof_hl: e.target.value }))}
                  />
                  <Input 
                    placeholder="HR (Hinten Rechts)"
                    value={form.hoof_hr}
                    onChange={e => setForm(f => ({ ...f, hoof_hr: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <Label>Besonderheiten bei der Bearbeitung</Label>
                <Textarea 
                  value={form.special_notes}
                  onChange={e => setForm(f => ({ ...f, special_notes: e.target.value }))}
                  placeholder="Wichtige Hinweise für den Hufbearbeiter..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="mt-0 space-y-4">
              <div className="space-y-1">
                <Label>Tierarzt</Label>
                <Input 
                  placeholder="Name"
                  value={form.contact_vet}
                  onChange={e => setForm(f => ({ ...f, contact_vet: e.target.value }))}
                />
                <Input 
                  placeholder="Telefon"
                  type="tel"
                  value={form.contact_vet_phone}
                  onChange={e => setForm(f => ({ ...f, contact_vet_phone: e.target.value }))}
                />
              </div>
              
              <div className="space-y-1">
                <Label>Trainer / Reitlehrer</Label>
                <Input 
                  placeholder="Name"
                  value={form.contact_trainer}
                  onChange={e => setForm(f => ({ ...f, contact_trainer: e.target.value }))}
                />
                <Input 
                  placeholder="Telefon"
                  type="tel"
                  value={form.contact_trainer_phone}
                  onChange={e => setForm(f => ({ ...f, contact_trainer_phone: e.target.value }))}
                />
              </div>
              
              <div className="space-y-1">
                <Label>Stall / Stallbetreiber</Label>
                <Input 
                  placeholder="Name"
                  value={form.contact_stable}
                  onChange={e => setForm(f => ({ ...f, contact_stable: e.target.value }))}
                />
                <Input 
                  placeholder="Telefon"
                  type="tel"
                  value={form.contact_stable_phone}
                  onChange={e => setForm(f => ({ ...f, contact_stable_phone: e.target.value }))}
                />
              </div>
              
              <div className="space-y-1">
                <Label>Reitbeteiligung / Pflege</Label>
                <Input 
                  placeholder="Name"
                  value={form.contact_caretaker}
                  onChange={e => setForm(f => ({ ...f, contact_caretaker: e.target.value }))}
                />
                <Input 
                  placeholder="Telefon"
                  type="tel"
                  value={form.contact_caretaker_phone}
                  onChange={e => setForm(f => ({ ...f, contact_caretaker_phone: e.target.value }))}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
