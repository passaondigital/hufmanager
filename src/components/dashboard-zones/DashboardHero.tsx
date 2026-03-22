import { format } from "date-fns";
import { de } from "date-fns/locale";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { isDemoEmail } from "@/lib/demo-accounts";
import { useAuth } from "@/hooks/useAuth";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "Guten Morgen";
  if (h >= 11 && h < 17) return "Guten Tag";
  if (h >= 17 && h < 22) return "Guten Abend";
  return "Gute Nacht";
}

interface DashboardHeroProps {
  name?: string | null;
  subtitle?: string;
  children?: React.ReactNode;
}

export function DashboardHero({ name, subtitle, children }: DashboardHeroProps) {
  const { user } = useAuth();
  const isDemo = isDemoEmail(user?.email);
  const firstName = name?.split(" ")[0];
  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {getGreeting()}{firstName ? `, ${firstName}` : ""}! 👋
        </h1>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-muted-foreground">
            {subtitle || format(today, "EEEE, d. MMMM yyyy", { locale: de })}
          </p>
          {isDemo && <DemoBadge />}
        </div>
      </div>

      {/* Slot for NextAppointmentCard, QuickActions, etc. */}
      {children}
    </div>
  );
}
