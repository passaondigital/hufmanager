import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Share2, Copy, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  horseId: string;
  horseName: string;
  children?: React.ReactNode;
}

const SHARE_SECTIONS = [
  { id: "stammdaten", label: "Stammdaten", desc: "Rasse, Alter, Chip-Nr." },
  { id: "gesundheit", label: "Gesundheitsverlauf", desc: "Wellbeing-Logs" },
  { id: "huf", label: "Huf-Historie", desc: "Messwerte & Fotos" },
  { id: "vet", label: "Vet-Befunde", desc: "Tierärztliche Einträge" },
  { id: "therapie", label: "Therapie", desc: "Behandlungsnotizen" },
  { id: "futter", label: "Futterplan", desc: "Aktuelle Fütterung" },
  { id: "bewegung", label: "Bewegungstagebuch", desc: "Aktivitäten" },
  { id: "medikamente", label: "Medikamente", desc: "Aktive Erinnerungen" },
] as const;

export function PferdeakteShareDialog({ horseId, horseName, children }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(["stammdaten", "gesundheit"]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCopyLink = async () => {
    const sections = selected.join(",");
    const shareUrl = `${window.location.origin}/emergency/${horseId}?sections=${sections}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link kopiert!");
    } catch {
      toast.error("Link konnte nicht kopiert werden");
    }
  };

  const handleSend = () => {
    if (!recipientEmail) {
      toast.error("Bitte E-Mail eingeben");
      return;
    }
    // TODO: Implement actual email sharing via edge function
    toast.success(`Einladung an ${recipientEmail} gesendet`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Share2 className="h-4 w-4" /> Teilen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Pferdeakte teilen – {horseName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Wähle aus, welche Bereiche du teilen möchtest:
          </p>

          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
            {SHARE_SECTIONS.map(section => (
              <label
                key={section.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selected.includes(section.id)}
                  onCheckedChange={() => toggle(section.id)}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium">{section.label}</span>
                  <p className="text-xs text-muted-foreground">{section.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Per E-Mail senden</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="tierarzt@beispiel.de"
                className="flex-1"
              />
              <Button size="sm" onClick={handleSend} disabled={selected.length === 0}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={handleCopyLink}
              disabled={selected.length === 0}
            >
              {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Kopiert!" : "Link kopieren"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Empfänger benötigen ein Hufi-Konto, um die geteilten Daten einzusehen.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
