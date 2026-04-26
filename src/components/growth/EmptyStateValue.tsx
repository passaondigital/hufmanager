import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  FileText, Car, Users, Calendar, Package, BarChart3,
  type LucideIcon
} from "lucide-react";

interface EmptyStateValueProps {
  type: "invoices" | "mileage" | "team" | "appointments" | "inventory" | "expenses" | "analysis" | "custom";
  customIcon?: LucideIcon;
  customEmoji?: string;
  customTitle?: string;
  customDescription?: string;
  customCta?: string;
  customNavigateTo?: string;
}

const emptyStates: Record<string, {
  icon: LucideIcon;
  emoji: string;
  title: string;
  description: string;
  cta: string;
  navigateTo: string;
}> = {
  invoices: {
    icon: FileText,
    emoji: "📄✓",
    title: "Deine erste digitale Rechnung",
    description: "Kein Drucker, kein Briefkasten — einfach per E-Mail direkt vom Stall. Dein Steuerberater wird sich freuen.",
    cta: "Erste Rechnung erstellen →",
    navigateTo: "/rechnungen",
  },
  mileage: {
    icon: Car,
    emoji: "🗺️",
    title: "Das Finanzamt freut sich — du auch.",
    description: "Jeden Kilometer den du fährst kannst du von der Steuer absetzen. Fahrtenbuch läuft automatisch mit.",
    cta: "Erste Fahrt erfassen →",
    navigateTo: "/fahrtenbuch",
  },
  team: {
    icon: Users,
    emoji: "👥",
    title: "Dein Team im Überblick",
    description: "Hast du Mitarbeiter oder planst du welche? Mit dem Team-Modul siehst du wer was wann gemacht hat — und sparst dir endlose WhatsApp-Gruppen.",
    cta: "Ersten Mitarbeiter einladen →",
    navigateTo: "/team",
  },
  appointments: {
    icon: Calendar,
    emoji: "📅",
    title: "Plane deinen ersten Termin",
    description: "Hufi erinnert dich und deinen Kunden automatisch. Schluss mit Zettelwirtschaft — kein Anrufen mehr nötig.",
    cta: "Ersten Termin erstellen →",
    navigateTo: "/calendar",
  },
  inventory: {
    icon: Package,
    emoji: "📦",
    title: "Dein Lager immer im Blick",
    description: "Hufnägel, Eisen, Werkzeug — wisse immer was du noch hast und wann du nachbestellen musst.",
    cta: "Erstes Material anlegen →",
    navigateTo: "/lager",
  },
  expenses: {
    icon: BarChart3,
    emoji: "💶",
    title: "Ausgaben erfassen, Überblick behalten",
    description: "Werkzeug, Fortbildung, Fahrzeugkosten — alles an einem Ort. Perfekt für die Steuererklärung.",
    cta: "Erste Ausgabe erfassen →",
    navigateTo: "/ausgaben",
  },
  analysis: {
    icon: BarChart3,
    emoji: "📈",
    title: "Hier siehst du bald wie dein Betrieb wächst.",
    description: "Leg jetzt los — die Zahlen kommen von selbst. Umsatz, Kunden, Termine — alles auf einen Blick.",
    cta: "Zum Dashboard →",
    navigateTo: "/home",
  },
};

export const EmptyStateValue = ({
  type,
  customIcon,
  customEmoji,
  customTitle,
  customDescription,
  customCta,
  customNavigateTo,
}: EmptyStateValueProps) => {
  const navigate = useNavigate();
  const config = type === "custom" ? null : emptyStates[type];

  const Icon = customIcon || config?.icon || FileText;
  const emoji = customEmoji || config?.emoji || "📋";
  const title = customTitle || config?.title || "";
  const description = customDescription || config?.description || "";
  const cta = customCta || config?.cta || "";
  const navigateTo = customNavigateTo || config?.navigateTo || "/";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      {/* Illustration */}
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <span className="text-4xl">{emoji}</span>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      <Button onClick={() => navigate(navigateTo)} className="gap-2 h-12 px-6 text-base font-semibold w-full sm:w-auto">
        {cta}
      </Button>
    </motion.div>
  );
};
