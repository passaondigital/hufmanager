import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ensureUserProfile } from '@/lib/ensureProfile';

interface MandatoryHorseModalProps {
  open: boolean;
  onComplete: (horseId: string) => void;
}

export function MandatoryHorseModal({ open, onComplete }: MandatoryHorseModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [horseName, setHorseName] = useState('');
  const [location, setLocation] = useState('');

  const handleCreate = async () => {
    // CRITICAL: Validate user is authenticated and has a valid ID
    if (!user || !user.id) {
      toast({
        title: 'Nicht angemeldet',
        description: 'Bitte melde dich an, um ein Pferd anzulegen.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!horseName.trim()) {
      toast({
        title: 'Name erforderlich',
        description: 'Bitte gib einen Namen für dein Pferd ein.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // AUTO-HEAL: Ensure profile exists before creating horse
      // This prevents foreign key violations for "ghost users"
      const profileResult = await ensureUserProfile(user);
      if (!profileResult.success) {
        toast({
          title: 'Profil-Fehler',
          description: profileResult.error || 'Profil konnte nicht erstellt werden.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      const { data, error } = await supabase
        .from('horses')
        .insert({
          name: horseName.trim(),
          location_name: location.trim() || null,
          owner_id: user.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({ title: 'Pferd angelegt!' });
      onComplete(data.id);
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto text-6xl">🐴</div>
          <DialogTitle className="text-xl">Lege dein erstes Pferd an</DialogTitle>
          <DialogDescription className="text-base">
            Damit dein Hufbearbeiter Termine für dich anlegen kann, brauchen wir ein paar Infos zu deinem Pferd.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="horse-name">Name des Pferdes *</Label>
            <Input
              id="horse-name"
              value={horseName}
              onChange={(e) => setHorseName(e.target.value)}
              placeholder="z.B. Sunny"
              maxLength={100}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="horse-location">Standort / Stall</Label>
            <Input
              id="horse-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Reiterhof Müller"
              maxLength={200}
            />
          </div>
        </div>

        <Button 
          onClick={handleCreate} 
          disabled={saving || !horseName.trim()}
          className="w-full h-12 text-base"
        >
          {saving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Pferd anlegen & loslegen
        </Button>
      </DialogContent>
    </Dialog>
  );
}
