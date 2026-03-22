import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Lock, Megaphone, RefreshCw, Sparkles } from "lucide-react";
import { AUTOMATION_TEMPLATES, type AutomationTemplate } from "./automationTemplates";

const ICON_MAP: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="w-5 h-5 text-[#F47B20]" />,
  Lock: <Lock className="w-5 h-5 text-[#F47B20]" />,
  Megaphone: <Megaphone className="w-5 h-5 text-[#F47B20]" />,
  RefreshCw: <RefreshCw className="w-5 h-5 text-[#F47B20]" />,
};

const BADGE_COLORS: Record<string, string> = {
  "Lead-Magnet": "bg-green-100 text-green-800",
  "Umsatz": "bg-blue-100 text-blue-800",
  "Wachstum": "bg-purple-100 text-purple-800",
  "Retention": "bg-amber-100 text-amber-800",
};

interface TemplatePickerCardProps {
  onSelect: (template: AutomationTemplate) => void;
}

export function TemplatePickerCard({ onSelect }: TemplatePickerCardProps) {
  return (
    <Card className="bg-white rounded-xl shadow-sm border-dashed border-2 border-[#F47B20]/30">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-[#F47B20]" />
          <h3 className="font-semibold text-black text-sm">Fertige Vorlagen – 1 Klick aktivieren</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Professionelle E-Mail-Sequenzen für die Pferdeakte, Tresor und Botschafter-Programm. Sofort einsatzbereit.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AUTOMATION_TEMPLATES.map((t) => (
            <div
              key={t.id}
              className="border rounded-lg p-3 hover:border-[#F47B20] hover:bg-[#FFF8F2] transition-colors cursor-pointer group"
              onClick={() => onSelect(t)}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{ICON_MAP[t.icon]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-black text-sm truncate">{t.name}</span>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 shrink-0 ${BADGE_COLORS[t.badge] || ""}`}>
                      {t.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {t.steps.filter(s => s.type === "email").length} E-Mails · {t.steps.filter(s => s.type === "delay").length} Pausen
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
