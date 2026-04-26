import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface ShareTemplate {
  id: string;
  label: string;
  emoji: string;
  text: string;
  action: "whatsapp" | "email" | "copy";
  emailSubject?: string;
}

interface HufrenteShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralLink: string;
}

export function HufrenteShareSheet({
  open,
  onOpenChange,
  referralLink,
}: HufrenteShareSheetProps) {
  const templates: ShareTemplate[] = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      emoji: "💬",
      action: "whatsapp",
      text: `Hey, ich nutze seit einer Weile Hufi für meine Hufpflege — Termine, Rechnungen, Pferdeakten alles digital, auch offline im Stall. Falls du das auch suchst: ${referralLink} (14 Tage kostenlos, keine Kreditkarte)`,
    },
    {
      id: "email",
      label: "E-Mail",
      emoji: "✉️",
      action: "email",
      emailSubject: "Hufi — vielleicht interessant für dich",
      text: `Hallo,\n\nich nutze seit einer Weile Hufi für meine tägliche Arbeit — Termine, Rechnungen, Pferdeakten, alles digital und DSGVO-konform.\n\nFalls du etwas Ähnliches suchst, schau dir das mal an:\n${referralLink}\n\n14 Tage kostenlos testen, keine Kreditkarte nötig.\n\nViele Grüße`,
    },
    {
      id: "social",
      label: "Social Media",
      emoji: "📱",
      action: "copy",
      text: `Als Hufpfleger/Therapeut/Trainer kennst du das: nach dem letzten Pferd fängt die eigentliche Arbeit erst an.\n\nHufManager hat das bei mir geändert — alles digital, offline-fähig, DSGVO-konform.\n\nSchau mal rein: ${referralLink} #Hufi #ZukunftPferd2030`,
    },
  ];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");

  const selected = templates.find((t) => t.id === selectedId);

  const handleSelect = (tmpl: ShareTemplate) => {
    setSelectedId(tmpl.id);
    setEditedText(tmpl.text);
  };

  const handleSend = () => {
    if (!selected) return;

    if (selected.action === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(editedText)}`, "_blank");
    } else if (selected.action === "email") {
      const subject = encodeURIComponent(selected.emailSubject || "");
      const body = encodeURIComponent(editedText);
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    } else {
      navigator.clipboard.writeText(editedText);
      toast({ title: "Text kopiert!", description: "In der Zwischenablage." });
    }

    onOpenChange(false);
    setSelectedId(null);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Hufi — Empfehlung",
          text: "Empfiehl Hufi an Kolleginnen und Kollegen",
          url: referralLink,
        });
      } catch {
        // user cancelled
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Empfehlung teilen</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Quick share buttons */}
          <div className="grid grid-cols-3 gap-2">
            {templates.map((tmpl) => (
              <Button
                key={tmpl.id}
                variant={selectedId === tmpl.id ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => handleSelect(tmpl)}
              >
                {tmpl.emoji} {tmpl.label}
              </Button>
            ))}
          </div>

          {/* Native share */}
          {"share" in navigator && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={handleNativeShare}
            >
              ↗️ System-Teilen
            </Button>
          )}

          {/* Editable text */}
          {selected && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Text anpassen vor dem Senden:
              </p>
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={6}
                className="text-sm"
              />
              <Button className="w-full" onClick={handleSend}>
                {selected.action === "copy" ? "Text kopieren" : `Via ${selected.label} senden`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
