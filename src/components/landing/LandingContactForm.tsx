import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen haben").max(100),
  email: z.string().email("Ungültige E-Mail-Adresse").max(255),
  phone: z.string().min(5, "Telefonnummer zu kurz").max(30).optional().or(z.literal("")),
  horse_name: z.string().max(100).optional().or(z.literal("")),
  message: z.string().min(10, "Nachricht muss mindestens 10 Zeichen haben").max(2000),
});

interface LandingContactFormProps {
  providerId: string;
  providerName: string;
  primaryColor?: string;
}

export function LandingContactForm({ providerId, providerName, primaryColor = "#d97706" }: LandingContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    horse_name: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const validation = contactSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const leadMessage = formData.horse_name
        ? `Pferd: ${formData.horse_name}\n\n${formData.message}`
        : formData.message;

      const { error } = await supabase.from("leads").insert({
        provider_id: providerId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        message: leadMessage,
        lead_type: "termin",
        status: "neu",
        source: "landingpage",
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Nachricht gesendet! Wir melden uns bald.");
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error("Fehler beim Senden. Bitte versuchen Sie es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <CardContent className="pt-8 pb-8">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle2 className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Vielen Dank!</h3>
          <p className="text-muted-foreground">
            Ihre Anfrage wurde erfolgreich gesendet. {providerName} wird sich in Kürze bei Ihnen melden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Kontakt aufnehmen</CardTitle>
        <CardDescription>
          Schreiben Sie mir eine Nachricht und ich melde mich schnellstmöglich bei Ihnen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Max Mustermann"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="max@beispiel.de"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+49 123 456789"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="horse_name">Name des Pferdes</Label>
              <Input
                id="horse_name"
                placeholder="z.B. Blitz"
                value={formData.horse_name}
                onChange={(e) => handleChange("horse_name", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Nachricht *</Label>
            <Textarea
              id="message"
              rows={4}
              placeholder="Wie kann ich Ihnen helfen?"
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
              className={errors.message ? "border-destructive" : ""}
            />
            {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            style={{ backgroundColor: primaryColor }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Nachricht senden
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Mit dem Absenden stimmen Sie unserer Datenschutzerklärung zu.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}