import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { WidgetContentProps } from "./types";

export default function BirthdaysContent(_props: WidgetContentProps) {
  const { user } = useAuth();

  const { data: contacts = [] } = useQuery({
    queryKey: ["widget-birthdays", user?.id],
    queryFn: async () => {
      // contacts table doesn't have birthday column, so use horses birthdate instead
      const { data } = await supabase
        .from("horses")
        .select("id, name, birth_year")
        .is("deleted_at", null)
        .not("birth_year", "is", null)
        .order("name")
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (contacts.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Keine Daten verfügbar</p>;
  }

  return (
    <div className="space-y-1.5">
      {contacts.map((h) => (
        <div key={h.id} className="flex items-center gap-2 py-1">
          <span className="text-base">🐴</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{h.name}</p>
            {h.birth_year && (
              <p className="text-[10px] text-muted-foreground">
                Geb. {h.birth_year} · {new Date().getFullYear() - h.birth_year} Jahre
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
