import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Gift, Bell, Sparkles, FileText, Megaphone, Package } from "lucide-react";
import { SYSTEM_CAMPAIGN_TEMPLATES } from "./SystemCampaignTemplates";

export interface EmailTemplate {
  id: string;
  name: string;
  icon: React.ElementType;
  subject: string;
  content_html: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "welcome",
    name: "Willkommen",
    icon: Sparkles,
    subject: "Willkommen bei uns! 🎉",
    content_html: `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
  <h1 style="color: #000; font-size: 24px;">Willkommen! 👋</h1>
  <p style="color: #333; line-height: 1.6;">Schön, dass du dabei bist! Wir freuen uns, dich in unserer Community begrüßen zu dürfen.</p>
  <p style="color: #333; line-height: 1.6;">In den nächsten Tagen erhältst du von uns wertvolle Tipps und Informationen.</p>
  <a href="#" style="display: inline-block; background: #F47B20; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Jetzt entdecken</a>
  <p style="color: #999; font-size: 12px; margin-top: 32px;">Du erhältst diese E-Mail, weil du dich für unseren Newsletter angemeldet hast.</p>
</div>`,
  },
  {
    id: "newsletter",
    name: "Newsletter",
    icon: Mail,
    subject: "Neuigkeiten aus dem Stall 🐴",
    content_html: `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
  <h1 style="color: #000; font-size: 24px;">Dein Newsletter 📬</h1>
  <p style="color: #333; line-height: 1.6;">Hier sind die neuesten Neuigkeiten für dich:</p>
  <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <h3 style="color: #000; margin: 0 0 8px;">📌 Highlight der Woche</h3>
    <p style="color: #333; margin: 0;">Dein Beitrag kommt hier hin...</p>
  </div>
  <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <h3 style="color: #000; margin: 0 0 8px;">💡 Tipp</h3>
    <p style="color: #333; margin: 0;">Ein hilfreicher Tipp für deine Leser...</p>
  </div>
  <a href="#" style="display: inline-block; background: #F47B20; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Mehr erfahren</a>
</div>`,
  },
  {
    id: "offer",
    name: "Angebot",
    icon: Gift,
    subject: "Exklusives Angebot nur für dich! 🎁",
    content_html: `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; text-align: center;">
  <h1 style="color: #000; font-size: 28px;">🎁 Exklusives Angebot</h1>
  <p style="color: #333; font-size: 18px; line-height: 1.6;">Nur für kurze Zeit verfügbar!</p>
  <div style="background: linear-gradient(135deg, #F47B20, #e06a10); border-radius: 12px; padding: 24px; margin: 24px 0; color: white;">
    <p style="font-size: 36px; font-weight: bold; margin: 0;">-20%</p>
    <p style="margin: 8px 0 0;">auf deine nächste Buchung</p>
  </div>
  <a href="#" style="display: inline-block; background: #000; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">Jetzt sichern</a>
  <p style="color: #999; font-size: 12px; margin-top: 32px;">Gültig bis [Datum]. Nicht mit anderen Aktionen kombinierbar.</p>
</div>`,
  },
  {
    id: "reminder",
    name: "Erinnerung",
    icon: Bell,
    subject: "Nicht vergessen! ⏰",
    content_html: `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
  <h1 style="color: #000; font-size: 24px;">⏰ Freundliche Erinnerung</h1>
  <p style="color: #333; line-height: 1.6;">Wir möchten dich kurz daran erinnern:</p>
  <div style="border-left: 4px solid #F47B20; padding-left: 16px; margin: 16px 0;">
    <p style="color: #333; font-weight: bold; margin: 0;">Dein nächster Termin</p>
    <p style="color: #666; margin: 4px 0 0;">[Datum und Uhrzeit hier einfügen]</p>
  </div>
  <p style="color: #333; line-height: 1.6;">Bei Fragen sind wir jederzeit für dich da.</p>
  <a href="#" style="display: inline-block; background: #F47B20; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Termin bestätigen</a>
</div>`,
  },
  {
    id: "update",
    name: "Update",
    icon: Megaphone,
    subject: "Wichtiges Update 📢",
    content_html: `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
  <h1 style="color: #000; font-size: 24px;">📢 Wichtiges Update</h1>
  <p style="color: #333; line-height: 1.6;">Wir haben Neuigkeiten, die dich betreffen:</p>
  <div style="background: #fff3e0; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #F47B20;">
    <p style="color: #333; margin: 0;">Hier kommt deine wichtige Nachricht hin...</p>
  </div>
  <p style="color: #333; line-height: 1.6;">Bei Fragen stehen wir dir gerne zur Verfügung.</p>
  <p style="color: #333;">Dein Team</p>
</div>`,
  },
  {
    id: "blank",
    name: "Leer",
    icon: FileText,
    subject: "",
    content_html: `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
  <h1 style="color: #000;">Dein Betreff</h1>
  <p style="color: #333; line-height: 1.6;">Dein Inhalt hier...</p>
</div>`,
  },
];

interface TemplateSelectorProps {
  onSelect: (template: EmailTemplate) => void;
}

// Convert system templates to EmailTemplate format
const SYSTEM_TEMPLATES_AS_EMAIL: EmailTemplate[] = SYSTEM_CAMPAIGN_TEMPLATES.map(t => ({
  id: t.id,
  name: t.name,
  icon: Package,
  subject: t.subject,
  content_html: t.contentHtml,
}));

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      {/* System-Vorlagen */}
      {SYSTEM_TEMPLATES_AS_EMAIL.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#F47B20] uppercase tracking-wide">📦 System-Vorlagen</p>
          <div className="grid grid-cols-1 gap-2">
            {SYSTEM_TEMPLATES_AS_EMAIL.map(t => (
              <Card
                key={t.id}
                className="bg-orange-50 hover:border-[#F47B20] cursor-pointer transition-colors group border-orange-200"
                onClick={() => onSelect(t)}
              >
                <CardContent className="pt-3 pb-3 flex items-center gap-3">
                  <Package className="w-5 h-5 text-[#F47B20] shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{SYSTEM_CAMPAIGN_TEMPLATES.find(s => s.id === t.id)?.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Standard-Vorlagen */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Starte mit einer Vorlage:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EMAIL_TEMPLATES.map(t => (
            <Card
              key={t.id}
              className="bg-white hover:border-[#F47B20] cursor-pointer transition-colors group"
              onClick={() => onSelect(t)}
            >
              <CardContent className="pt-4 pb-3 text-center">
                <t.icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground group-hover:text-[#F47B20] transition-colors" />
                <p className="text-xs font-medium text-black">{t.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
