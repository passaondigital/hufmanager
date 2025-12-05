import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Camera, Check, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppointmentCompletionDialogProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  horseName: string;
  onCompleted: () => void;
}

type StatusLevel = 'green' | 'yellow' | 'red';

const YELLOW_OPTIONS = [
  { 
    id: 'bad_ground', 
    label: 'Bodenverhältnisse schlecht',
    legalText: 'Eine fachgerechte Ganganalyse war aufgrund der Bodenverhältnisse vor Ort nicht möglich. Haftung für Boden-bedingte Beurteilungsfehler ausgeschlossen.'
  },
  { 
    id: 'uncooperative', 
    label: 'Pferd unkooperativ',
    legalText: 'Das Pferd zeigte sich während der Bearbeitung unkooperativ. Durchführung unter erschwerten Bedingungen.'
  },
  { 
    id: 'bad_lighting', 
    label: 'Beleuchtung mangelhaft',
    legalText: 'Aufgrund mangelhafter Lichtverhältnisse war eine vollständige visuelle Beurteilung eingeschränkt.'
  },
  { 
    id: 'known_issue', 
    label: 'Vorerkrankung/Lahmheit bekannt',
    legalText: 'Bearbeitung erfolgte palliativ unter Berücksichtigung der bekannten Bestands-Problematik. Keine Gewährleistung für Verbesserung des Gangbildes.'
  },
  { 
    id: 'weather', 
    label: 'Witterung erschwert',
    legalText: 'Witterungsbedingt erschwerte Arbeitsbedingungen. Bearbeitung nach bestem fachlichen Ermessen durchgeführt.'
  },
];

export function AppointmentCompletionDialog({
  open,
  onClose,
  appointmentId,
  horseName,
  onCompleted,
}: AppointmentCompletionDialogProps) {
  const [status, setStatus] = useState<StatusLevel>('green');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [problemReason, setProblemReason] = useState('');
  const [clientPresent, setClientPresent] = useState(true);
  const [photoSent, setPhotoSent] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${appointmentId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('hoof_photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('hoof_photos')
        .getPublicUrl(fileName);

      setPhotoUrl(urlData.publicUrl);
      toast({ title: "Foto gespeichert" });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleIssue = (id: string) => {
    setSelectedIssues(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    if (status === 'red' && !problemReason.trim()) {
      toast({ title: "Bitte Grund angeben", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Build legal disclaimer text
      let legalNotes = '';
      if (status === 'green') {
        legalNotes = 'Bearbeitung abgeschlossen. Pferd zeigte sich unauffällig, Gangbild nach Bearbeitung kontrolliert und für gut befunden.';
      } else if (status === 'yellow') {
        const selectedTexts = YELLOW_OPTIONS
          .filter(opt => selectedIssues.includes(opt.id))
          .map(opt => opt.legalText);
        legalNotes = selectedTexts.join(' ');
      } else {
        legalNotes = `Termin abgebrochen/Problem: ${problemReason}`;
      }

      // Add client presence info
      if (!clientPresent) {
        legalNotes += ' Kunde war bei Abschluss nicht anwesend - Foto-Dokumentation wurde übermittelt.';
      }

      const { error } = await supabase
        .from('appointments')
        .update({
          status: status === 'red' ? 'cancelled' : 'completed',
          completion_notes: legalNotes,
          gait_analysis_done: status === 'green',
          gait_analysis_ok: status === 'green',
          completed_at: new Date().toISOString(),
          signed_by_name: clientPresent ? 'Kunde anwesend' : 'Foto-Dokumentation',
          signed_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (error) throw error;

      // Try to send report email (non-blocking)
      try {
        await supabase.functions.invoke('generate-completion-report', {
          body: { appointmentId },
        });
      } catch (e) {
        console.log('Report generation skipped');
      }

      toast({ 
        title: status === 'red' ? "Termin abgebrochen" : "Termin abgeschlossen",
        description: status === 'green' ? "In 2 Sekunden erledigt! 🚀" : undefined
      });
      onCompleted();
      onClose();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Termin beenden</DialogTitle>
          <DialogDescription>{horseName}</DialogDescription>
        </DialogHeader>

        {/* Status Ampel */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => { setStatus('green'); setSelectedIssues([]); }}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-center",
              status === 'green' 
                ? "border-green-500 bg-green-500/10" 
                : "border-muted hover:border-green-500/50"
            )}
          >
            <div className="text-3xl mb-1">🟢</div>
            <div className="text-xs font-medium">Alles gut</div>
          </button>
          
          <button
            onClick={() => setStatus('yellow')}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-center",
              status === 'yellow' 
                ? "border-amber-500 bg-amber-500/10" 
                : "border-muted hover:border-amber-500/50"
            )}
          >
            <div className="text-3xl mb-1">🟡</div>
            <div className="text-xs font-medium">Auffälligkeiten</div>
          </button>
          
          <button
            onClick={() => setStatus('red')}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-center",
              status === 'red' 
                ? "border-red-500 bg-red-500/10" 
                : "border-muted hover:border-red-500/50"
            )}
          >
            <div className="text-3xl mb-1">🔴</div>
            <div className="text-xs font-medium">Problem</div>
          </button>
        </div>

        {/* Yellow Options */}
        {status === 'yellow' && (
          <div className="space-y-2 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
            <p className="text-xs font-medium text-amber-700 mb-2">
              Was war los? (Mehrfachauswahl)
            </p>
            <div className="flex flex-wrap gap-2">
              {YELLOW_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => toggleIssue(opt.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    selectedIssues.includes(opt.id)
                      ? "bg-amber-500 text-white"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {selectedIssues.includes('bad_ground') && (
              <p className="text-xs text-amber-600 mt-2 p-2 bg-amber-500/10 rounded">
                ✓ Haftungsausschluss für Ganganalyse wird automatisch dokumentiert
              </p>
            )}
          </div>
        )}

        {/* Red - Problem Reason */}
        {status === 'red' && (
          <div className="space-y-2 p-3 bg-red-500/5 rounded-lg border border-red-500/20">
            <p className="text-xs font-medium text-red-700">
              Was ist passiert? (Pflichtfeld)
            </p>
            <Textarea
              value={problemReason}
              onChange={(e) => setProblemReason(e.target.value)}
              placeholder="Kurze Beschreibung..."
              rows={2}
              className="text-sm"
            />
          </div>
        )}

        {/* Quick Photo */}
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoCapture}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-1" />
            )}
            {photoUrl ? "Foto ✓" : "Schnell-Foto"}
          </Button>
        </div>

        {/* Client Presence */}
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              id="client-present"
              checked={clientPresent}
              onCheckedChange={(c) => setClientPresent(c as boolean)}
            />
            <label htmlFor="client-present" className="text-sm cursor-pointer">
              Kunde war anwesend & zufrieden
            </label>
          </div>
          
          {!clientPresent && (
            <div className="flex items-center gap-3 pl-6">
              <Checkbox
                id="photo-sent"
                checked={photoSent}
                onCheckedChange={(c) => setPhotoSent(c as boolean)}
              />
              <label htmlFor="photo-sent" className="text-xs text-muted-foreground cursor-pointer">
                Foto-Dokumentation wurde gesendet
              </label>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">
            Abbrechen
          </Button>
          <Button 
            onClick={handleComplete} 
            disabled={saving || (status === 'red' && !problemReason.trim())}
            className={cn(
              "flex-1",
              status === 'green' && "bg-green-600 hover:bg-green-700",
              status === 'yellow' && "bg-amber-600 hover:bg-amber-700",
              status === 'red' && "bg-red-600 hover:bg-red-700"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : status === 'green' ? (
              <Check className="h-4 w-4 mr-1" />
            ) : status === 'yellow' ? (
              <AlertTriangle className="h-4 w-4 mr-1" />
            ) : (
              <XCircle className="h-4 w-4 mr-1" />
            )}
            {status === 'red' ? 'Abbrechen' : 'Fertig'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
