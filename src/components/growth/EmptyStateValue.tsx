import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  FileText, Car, Users, Calendar, Package, BarChart3,
  type LucideIcon
} from "lucide-react";

interface EmptyStateValueProps {
  type: "invoices" | "mileage" | "team" | "appointments" | "inventory" | "expenses" | "custom";
  customIcon?: LucideIcon;
  customTitle?: string;
  customDescription?: string;
  customCta?: string;
  customNavigateTo?: string;
}

const emptyStates: Record<string, {
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  navigateTo: string;
}> = {
  invoices: {
    icon: FileText,
    title: "Deine erste Rechnung in 60 Sekunden",
    description: "Kein Ausdrucken, kein Versenden per Post — HufManager schickt sie direkt als PDF per E-Mail. Dein Steuerberater wird sich freuen.",
    cta: "Erste Rechnung erstellen →",
    navigateTo: "/rechnungen",
  },
  mileage: {
    icon: Car,
    title: "Das Finanzamt freut sich. Du auch.",
    description: "Nie wieder Kilometer von Hand eintragen. HufManager erfasst deine Fahrten automatisch und erstellt den Nachweis fürs Finanzamt.",
    cta: "Erste Fahrt erfassen →",
    navigateTo: "/fahrtenbuch",
  },
  team: {
    icon: Users,
    title: "Dein Team im Überblick",
    description: "Hast du Mitarbeiter oder planst du welche? Mit dem Team-Modul siehst du wer was wann gemacht hat — und sparst dir endlose WhatsApp-Gruppen.",
    cta: "Ersten Mitarbeiter einladen →",
    navigateTo: "/team",
  },
  appointments: {
    icon: Calendar,
    title: "Alle Termine an einem Ort",
    description: "Schluss mit Zettelwirtschaft. Plane deine Termine, deine Kunden werden automatisch erinnert — kein Anrufen mehr nötig.",
    cta: "Ersten Termin erstellen →",
    navigateTo: "/calendar",
  },
  inventory: {
    icon: Package,
    title: "Dein Lager immer im Blick",
    description: "Hufnägel, Eisen, Werkzeug — wisse immer was du noch hast und wann du nachbestellen musst.",
    cta: "Erstes Material anlegen →",
    navigateTo: "/lager",
  },
  expenses: {
    icon: BarChart3,
    title: "Ausgaben erfassen, Überblick behalten",
    description: "Werkzeug, Fortbildung, Fahrzeugkosten — alles an einem Ort. Perfekt für die Steuererklärung.",
    cta: "Erste Ausgabe erfassen →",
    navigateTo: "/ausgaben",
  },
};

export const EmptyStateValue = ({
  type,
  customIcon,
  customTitle,
  customDescription,
  customCta,
  customNavigateTo,
}: EmptyStateValueProps) => {
  const navigate = useNavigate();
  const config = type === "custom"
    ? null
    : emptyStates[type];

  const Icon = customIcon || config?.icon || FileText;
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
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      <Button onClick={() => navigate(navigateTo)} className="gap-2">
        {cta}
      </Button>
    </motion.div>
  );
};
