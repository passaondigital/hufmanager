import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LifeBuoy, Mail, Send, Loader2, HelpCircle, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const contactSchema = z.object({
  subject: z.string().min(3, "Betreff muss mindestens 3 Zeichen haben").max(100),
  message: z.string().min(10, "Nachricht muss mindestens 10 Zeichen haben").max(2000),
});

const faqs = [
  {
    question: "Wie füge ich einen neuen Kunden hinzu?",
    answer: "Gehen Sie zu 'Aufnahme' im Hauptmenü und füllen Sie das Formular aus. Sie können den Kunden danach per E-Mail zur KundenApp einladen.",
  },
  {
    question: "Wie funktioniert der iCal-Export?",
    answer: "Klicken Sie im Kalender auf 'Mit Handy synchronisieren'. Kopieren Sie den Link und fügen Sie ihn in Ihrer Kalender-App (Apple Kalender oder Google Kalender) als Abo hinzu.",
  },
  {
    question: "Kann ich Termine per Drag & Drop verschieben?",
    answer: "Ja! In der Wochen- oder Tagesansicht können Sie Termine einfach ziehen. Der Kunde wird automatisch über die Änderung informiert.",
  },
  {
    question: "Wie erstelle ich eine Hufanalyse?",
    answer: "Gehen Sie zu 'Hufanalyse' im Menü, wählen Sie ein Pferd aus und klicken Sie auf 'Analyse starten'. Der Wizard führt Sie durch alle Schritte.",
  },
  {
    question: "Wo finde ich meine Rechnungen?",
    answer: "Unter Management → Abo & Zahlung findest du deine Rechnungen und kannst dein Abonnement verwalten.",
  },
  {
    question: "Wie lade ich mein Logo hoch?",
    answer: "Gehe zu Management → Mein Profil und klicke auf 'Logo hochladen'. Unterstützt werden PNG, JPG und WebP (max. 2MB).",
  },
];

const Support = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = contactSchema.safeParse(formData);
    if (!validation.success) {
      toast({
        title: "Validierungsfehler",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Create mailto link with pre-filled content
    const mailtoUrl = `mailto:support@hufmanager.de?(formData.subject)}&body=${encodeURIComponent(
      `Von: ${user?.email || "Unbekannt"}\n\n${formData.message}`
    )}`;

    window.location.href = mailtoUrl;

    toast({
      title: "E-Mail-Client geöffnet",
      description: "Bitte senden Sie die E-Mail über Ihren E-Mail-Client.",
    });

    setIsSubmitting(false);
    setFormData({ subject: "", message: "" });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-primary" />
          Hilfe & Support
        </h1>
        <p className="text-muted-foreground mt-1">
          Finden Sie Antworten oder kontaktieren Sie unser Support-Team
        </p>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Häufig gestellte Fragen
          </CardTitle>
          <CardDescription>
            Schnelle Antworten auf die wichtigsten Fragen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Support kontaktieren
          </CardTitle>
          <CardDescription>
            Haben Sie eine Frage, die hier nicht beantwortet wird? Schreiben Sie uns!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Betreff</Label>
              <Input
                id="subject"
                placeholder="Worum geht es?"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Ihre Nachricht</Label>
              <Textarea
                id="message"
                placeholder="Beschreiben Sie Ihr Anliegen möglichst genau..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={5}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.message.length}/2000
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Nachricht senden
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.href = "mailto:support@hufmanager.de"}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Direkt per E-Mail
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">E-Mail Support</p>
              <a
                href="mailto:support@hufmanager.de"
                className="text-primary hover:underline"
              >
                support@hufmanager.de
              </a>
              <p className="text-sm text-muted-foreground mt-1">
                Wir antworten in der Regel innerhalb von 24 Stunden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Support;
