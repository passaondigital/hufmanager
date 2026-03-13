import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

const FAQ = [
  {
    q: "Wie funktioniert das Affiliate-Programm?",
    a: "Du teilst deinen persönlichen Referral-Link. Jeder der über diesen Link ein HufManager-Paket bucht, wird dir zugeordnet. Du erhältst automatisch Provision — gestaffelt nach deiner Stufe (bis zu 50%).",
  },
  {
    q: "Wann bekomme ich meine Provision ausgezahlt?",
    a: "Provisionen werden monatlich zum 15. über CopeCart ausgezahlt. Voraussetzung ist ein verifizierter CopeCart-Account mit hinterlegten Bankdaten.",
  },
  {
    q: "Wie erstelle ich einen CopeCart-Account?",
    a: "Gehe auf copecart.com, registriere dich kostenlos, verifiziere deine E-Mail und hinterlege deinen Benutzernamen in deinen Botschafter-Einstellungen.",
  },
  {
    q: "Wie teile ich meinen Referral-Link?",
    a: "Kopiere deinen Link auf der Übersichtsseite und teile ihn per WhatsApp, Instagram, E-Mail oder auf deiner Website. Unter Werbemittel findest du fertige Texte und Grafiken.",
  },
  {
    q: "Was bedeutet #BID?",
    a: "BID steht für Botschafter-ID — deine eindeutige Kennung im HufManager-System. Sie wird automatisch vergeben und ist mit deinem Account verknüpft.",
  },
  {
    q: "Wie werde ich auf der Launchpage gelistet?",
    a: "Aktive Botschafter mit mindestens einer Conversion werden automatisch auf der öffentlichen Top-10-Rangliste der Launchpage angezeigt (mit deinem Anzeigenamen).",
  },
  {
    q: "Kann ich mehrere Links erstellen?",
    a: "Aktuell hat jeder Botschafter einen einzigen Referral-Code/Link. Du kannst ihn überall einsetzen — die Klicks und Conversions werden zentral gezählt.",
  },
];

export function BotschafterFloatingHelp() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-[52px] h-[52px] rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
        aria-label="Hilfe"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-[320px] max-w-full h-full bg-background shadow-xl animate-in slide-in-from-right overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-lg">Hilfe & Support</h2>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FAQ */}
            <div className="p-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Schnell-Antworten</p>
              <Accordion type="single" collapsible className="space-y-1">
                {FAQ.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-3">
                    <AccordionTrigger className="text-sm text-left py-3 hover:no-underline">
                      ❓ {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-3">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <Separator className="my-5" />

              <p className="text-sm text-muted-foreground mb-3">Deine Frage ist nicht dabei?</p>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => { setOpen(false); navigate("/botschafter/nachrichten"); }}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Pascal direkt fragen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
