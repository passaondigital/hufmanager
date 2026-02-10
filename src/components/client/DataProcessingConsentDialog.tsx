import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText } from "lucide-react";

interface DataProcessingConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerName: string;
  onConsent: () => void;
}

export function DataProcessingConsentDialog({
  open,
  onOpenChange,
  providerName,
  onConsent,
}: DataProcessingConsentDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Datenschutz-Einwilligung
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Um dich mit <strong className="text-foreground">{providerName}</strong> zu verbinden, 
                benötigen wir deine Einwilligung zur Datenverarbeitung gemäß Art. 6 Abs. 1 lit. a DSGVO.
              </p>

              <ScrollArea className="max-h-48">
                <div className="space-y-3 text-sm pr-4">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Welche Daten werden geteilt?</p>
                      <ul className="list-disc ml-4 mt-1 space-y-0.5 text-muted-foreground">
                        <li>Dein Name und Kontaktdaten</li>
                        <li>Deine Pferde und deren Stammdaten</li>
                        <li>Stallstandort (für Tourenplanung)</li>
                        <li>Behandlungshistorie und Huffotos</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Zweck der Verarbeitung</p>
                      <p className="text-muted-foreground mt-0.5">
                        Terminplanung, Behandlungsdokumentation und Kommunikation 
                        zwischen dir und deinem Hufbearbeiter.
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-2 text-xs text-muted-foreground">
                    <p>
                      Du kannst diese Einwilligung jederzeit widerrufen, indem du die 
                      Verbindung zum Hufbearbeiter unter „Berechtigungen" trennst. 
                      Du hast jederzeit das Recht auf Auskunft, Berichtigung und Löschung 
                      deiner Daten (Art. 15–17 DSGVO).
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConsent}>
            <Shield className="h-4 w-4 mr-2" />
            Einwilligen & verbinden
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
