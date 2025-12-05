import { useState } from "react";
import { USAGE_OPTIONS, HOUSING_OPTIONS } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateHorseModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (horseId: string) => void;
}

export function CreateHorseModal({ open, onClose, onCreated }: CreateHorseModalProps) {
  const [saving, setSaving] = useState(false);
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

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name ist erforderlich", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('horses')
        .insert({
          name: form.name.trim(),
          nickname: form.nickname.trim() || null,
          breed: form.breed.trim() || null,
          birth_year: form.birth_year ? parseInt(form.birth_year) : null,
          gender: form.gender || null,
          color: form.color.trim() || null,
          usage: form.usage || null,
          housing: form.housing || null,
          owner_id: userData.user.id,
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input 
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Sunny"
              />
            </div>
            <div>
              <Label>Rufname</Label>
              <Input 
                value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                placeholder="z.B. Sunni"
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
              />
            </div>
            <div>
              <Label>Geburtsjahr</Label>
              <Input 
                type="number"
                value={form.birth_year}
                onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))}
                placeholder="z.B. 2018"
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
