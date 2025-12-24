import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield } from "lucide-react";

interface LegalFooterProps {
  businessName: string;
  impressumText: string | null;
  termsText: string | null;
  primaryColor: string;
}

export function LegalFooter({
  businessName,
  impressumText,
  termsText,
  primaryColor,
}: LegalFooterProps) {
  const [showImpressum, setShowImpressum] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      <footer 
        className="py-10 px-4 border-t"
        style={{ borderColor: `${primaryColor}30` }}
      >
        <div className="max-w-4xl mx-auto">

          {/* Legal Links */}
          <div className="flex justify-center gap-4 mb-6">
            {impressumText && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-2"
                onClick={() => setShowImpressum(true)}
              >
                <FileText className="h-4 w-4" />
                Impressum
              </Button>
            )}
            {termsText && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-2"
                onClick={() => setShowTerms(true)}
              >
                <Shield className="h-4 w-4" />
                AGB & Datenschutz
              </Button>
            )}
          </div>

          {/* Copyright */}
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {businessName}. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>

      {/* Impressum Modal */}
      <Dialog open={showImpressum} onOpenChange={setShowImpressum}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" style={{ color: primaryColor }} />
              Impressum
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {impressumText}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Terms Modal */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: primaryColor }} />
              AGB & Datenschutz
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {termsText}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
