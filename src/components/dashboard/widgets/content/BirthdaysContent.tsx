import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import type { WidgetContentProps } from "./types";

export default function BirthdaysContent(_props: WidgetContentProps) {
  const { user } = useAuth();

  const { data: birthdays = [] } = useQuery({
    queryKey: ["widget-birthdays", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, birthday")
        .eq("provider_id", user!.id)
        .not("birthday", "is", null);

      const now = new Date();
      const upcoming = (data || [])
        .map((c) => {
          if (!c.birthday) return null;
          const bday = new Date(c.birthday);
          const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
          if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1);
          const daysUntil = Math.floor((thisYear.getTime() - now.getTime()) / 86400000);
          return { ...c, daysUntil, nextBirthday: thisYear };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null && c.daysUntil <= 14)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5);

      return upcoming;
    },
    enabled: !!user?.id,
  });

  if (birthdays.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Keine Geburtstage diese Woche</p>;
  }

  return (
    <div className="space-y-1.5">
      {birthdays.map((b) => (
        <div key={b.id} className="flex items-center gap-2 py-1">
          <span className="text-base">🎂</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{b.full_name}</p>
            <p className="text-[10px] text-muted-foreground">
              {b.daysUntil === 0 ? "Heute!" : `In ${b.daysUntil} Tagen`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
