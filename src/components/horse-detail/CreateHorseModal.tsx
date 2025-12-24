import { useState, useRef } from "react";
import { USAGE_OPTIONS, HOUSING_OPTIONS } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Camera } from "lucide-react";
import { z } from "zod";
import { uploadFile, getStorageUrl } from "@/lib/storage";

// Validation schema
const horseFormSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich").max(100, "Name darf maximal 100 Zeichen haben"),
  nickname: z.string().trim().max(50, "Rufname darf maximal 50 Zeichen haben").optional(),
  breed: z.string().trim().max(100, "Rasse darf maximal 100 Zeichen haben").optional(),
  birth_year: z.string()
    .refine((val) => !val || /^\d{4}$/.test(val), "Geburtsjahr muss 4 Ziffern haben")
    .refine((val) => {
      if (!val) return true;
      const year = parseInt(val);
      const currentYear = new Date().getFullYear();
      return year >= 1970 && year <= currentYear;
    }, "Geburtsjahr muss zwischen 1970 und heute liegen")
    .optional(),
  gender: z.string().optional(),
  color: z.string().trim().max(50, "Farbe darf maximal 50 Zeichen haben").optional(),
  usage: z.string().optional(),
  housing: z.string().optional(),
});

interface CreateHorseModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (horseId: string) => void;
  /** Optional: Override owner_id (for providers creating horses for clients) */
  ownerId?: string;
}

export function CreateHorseModal({ open, onClose, onCreated, ownerId }: CreateHorseModalProps) {
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    nickname: '',
    breed: '',
    birth_year: '',
    gender: '',
    color: '',
    usage: '',
    housing: '',
  });

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

    // Show preview immediately
    setPhotoPreview(URL.createObjectURL(file));
    setUploadingPhoto(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      // Use temp UUID, will be updated after horse creation
      const tempId = crypto.randomUUID();
      const filePath = `${tempId}/profile_${crypto.randomUUID()}.${fileExt}`;

      const { path, error: uploadError } = await uploadFile('horse-documents', filePath, file, { upsert: true });
      if (uploadError || !path) throw uploadError || new Error("Upload failed");

      setPhotoUrl(path);
      toast({ title: "Foto hochgeladen" });
    } catch (error: any) {
      toast({
        title: "Fehler beim Upload",
        description: error.message,
        variant: "destructive",
      });
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreate = async () => {
    // Validate with zod schema
    const validationResult = horseFormSchema.safeParse(form);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Validierungsfehler",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Nicht angemeldet");

      const validated = validationResult.data;
      
      // Use provided ownerId or fall back to current user (for clients creating their own horses)
      const targetOwnerId = ownerId || userData.user.id;

      const { data, error } = await supabase
        .from('horses')
        .insert({
          name: validated.name,
          nickname: validated.nickname || null,
          breed: validated.breed || null,
          birth_year: validated.birth_year ? parseInt(validated.birth_year) : null,
          gender: validated.gender || null,
          color: validated.color || null,
          usage: validated.usage || null,
          housing: validated.housing || null,
          owner_id: targetOwnerId,
          photo_url: photoUrl || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({ title: "Pferd erfolgreich angelegt" });
      onCreated(data.id);
      onClose();
      
      // Reset form
      setForm({
        name: '',
        nickname: '',
        breed: '',
        birth_year: '',
        gender: '',
        color: '',
        usage: '',
        housing: '',
      });
      setPhotoUrl("");
      setPhotoPreview(null);
    } catch (error: any) {
      toast({
        title: "Fehler beim Anlegen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Neues Pferd anlegen</SheetTitle>
          <SheetDescription>
            Füge ein neues Pferd zu deiner digitalen Pferdeakte hinzu
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Photo Upload */}
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {photoPreview ? (
                <img src={photoPreview} alt="Pferd" className="h-full w-full object-cover" />
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
                Foto hochladen
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input 
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Sunny"
                maxLength={100}
              />
            </div>
            <div>
              <Label>Rufname</Label>
              <Input 
                value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                placeholder="z.B. Sunni"
                maxLength={50}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rasse</Label>
              <Input 
                value={form.breed}
                onChange={e => setForm(f => ({ ...f, breed: e.target.value }))}
                placeholder="z.B. Haflinger"
                maxLength={100}
              />
            </div>
            <div>
              <Label>Geburtsjahr</Label>
              <Input 
                type="number"
                value={form.birth_year}
                onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))}
                placeholder="z.B. 2018"
                min={1970}
                max={new Date().getFullYear()}
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
                placeholder="z.B. Fuchs"
                maxLength={50}
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
        </div>
        
        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Pferd anlegen
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
