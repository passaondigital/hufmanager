import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, PartyPopper, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Milestone {
  id: string;
  icon: typeof Trophy;
  title: string;
  description: string;
  check: (counts: MilestoneCounts) => boolean;
}

interface MilestoneCounts {
  invoices: number;
  clients: number;
  appointments: number;
  horses: number;
}

const milestones: Milestone[] = [
  {
    id: "first_invoice",
    icon: PartyPopper,
    title: "Deine erste digitale Rechnung! 🎉",
    description: "Dein Steuerberater wird dich lieben. Ab jetzt alles automatisch.",
    check: (c) => c.invoices === 1,
  },
  {
    id: "10_clients",
    icon: Users,
    title: "10 Kunden — ein echtes Netzwerk!",
    description: "Du bist dabei dir einen richtigen Kundenstamm aufzubauen. Weiter so!",
    check: (c) => c.clients >= 10,
  },
  {
    id: "50_appointments",
    icon: TrendingUp,
    title: "50 Termine geschafft!",
    description: "Das sind 50 mal professionelle Arbeit, dokumentiert und nachvollziehbar.",
    check: (c) => c.appointments >= 50,
  },
  {
    id: "5_horses",
    icon: Trophy,
    title: "5 Pferde in der Akte",
    description: "Deine digitale Kartei wächst. Alle Pferdeakten immer griffbereit.",
    check: (c) => c.horses >= 5,
  },
];

const STORAGE_PREFIX = "hm_milestone_seen_";

export const MilestoneCelebration = () => {
  const { user } = useAuth();
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const checkMilestones = async () => {
      const [invoicesRes, clientsRes, appointmentsRes, horsesRes] = await Promise.all([
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("provider_id", user.id),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("created_by_provider_id", user.id),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("provider_id", user.id),
        supabase.from("horses").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
      ]);

      const counts: MilestoneCounts = {
        invoices: invoicesRes.count ?? 0,
        clients: clientsRes.count ?? 0,
        appointments: appointmentsRes.count ?? 0,
        horses: horsesRes.count ?? 0,
      };

      const unseen = milestones.find(
        (m) => m.check(counts) && !localStorage.getItem(STORAGE_PREFIX + m.id)
      );

      if (unseen) setActiveMilestone(unseen);
    };

    checkMilestones();
  }, [user?.id]);

  const dismiss = () => {
    if (activeMilestone) {
      localStorage.setItem(STORAGE_PREFIX + activeMilestone.id, "1");
    }
    setActiveMilestone(null);
  };

  return (
    <AnimatePresence>
      {activeMilestone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <activeMilestone.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{activeMilestone.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{activeMilestone.description}</p>
            </div>
            <button onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
