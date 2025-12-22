import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, Mail } from "lucide-react";

interface ServiceInquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  providerId: string;
  providerEmail?: string | null;
  primaryColor?: string;
}

export const ServiceInquiryModal = ({
  open,
  onOpenChange,
  serviceName,
  providerId,
  providerEmail,
  primaryColor = "#d97706"
}: ServiceInquiryModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('leads').insert({
        provider_id: providerId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        message: `Anfrage für: ${serviceName}\n\n${formData.message}`,
        lead_type: 'anfrage',
        source: 'service_inquiry'
      });

      if (error) throw error;

      toast({
        title: "Anfrage gesendet!",
        description: "Wir werden uns schnellstmöglich bei Ihnen melden."
      });

      setFormData({ name: "", email: "", phone: "", message: "" });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "Anfrage konnte nicht gesendet werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailFallback = () => {
    if (providerEmail) {
      const subject = encodeURIComponent(`Anfrage für: ${serviceName}`);
      const body = encodeURIComponent(`Hallo,\n\nich interessiere mich für den Service "${serviceName}".\n\nMit freundlichen Grüßen`);
      window.location.href = `mailto:${providerEmail}?subject=${subject}&body=${body}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Termin anfragen</DialogTitle>
          <DialogDescription>
            Anfrage für: <span className="font-medium text-foreground">{serviceName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Ihr Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="ihre@email.de"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+49 123 456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Nachricht</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Erzählen Sie uns von Ihrem Pferd und Ihrem Anliegen..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Anfrage senden
                </>
              )}
            </Button>
            
            {providerEmail && (
              <Button
                type="button"
                variant="outline"
                onClick={handleEmailFallback}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                E-Mail
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
