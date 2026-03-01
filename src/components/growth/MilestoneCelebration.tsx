import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, PartyPopper, TrendingUp, Users, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ConfettiEffect } from "@/components/onboarding/ConfettiEffect";

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
  completedAppointments: number;
}

const milestones: Milestone[] = [
  {
    id: "first_client",
    icon: PartyPopper,
    title: "Erster Kunde — der Anfang von allem. 🎉",
    description: "Ab jetzt läuft dein Betrieb digital.",
    check: (c) => c.clients >= 1,
  },
  {
    id: "first_invoice",
    icon: PartyPopper,
    title: "Deine erste digitale Rechnung ist raus. 🧾",
    description: "Dein Steuerberater wird dich lieben.",
    check: (c) => c.invoices >= 1,
  },
  {
    id: "5_clients",
    icon: Users,
    title: "5 Kunden im System — du baust dir was auf. 💪",
    description: "Ein echtes Netzwerk entsteht. Weiter so!",
    check: (c) => c.clients >= 5,
  },
  {
    id: "first_completed",
    icon: Check,
    title: "Job done. Dokumentation gespeichert. ✓",
    description: "Rechnung kann jetzt mit einem Klick raus.",
    check: (c) => c.completedAppointments >= 1,
  },
  {
    id: "10_horses",
    icon: Trophy,
    title: "10 Pferde — das ist schon ein richtiger Betrieb. 🐴",
    description: "Deine digitale Kartei wächst. Alle Pferdeakten immer griffbereit.",
    check: (c) => c.horses >= 10,
  },
  {
    id: "50_appointments",
    icon: TrendingUp,
    title: "50 Termine geschafft! 🏆",
    description: "Das sind 50 mal professionelle Arbeit, dokumentiert und nachvollziehbar.",
    check: (c) => c.appointments >= 50,
  },
];

const STORAGE_PREFIX = "hm_milestone_seen_";

export const MilestoneCelebration = () => {
  const { user } = useAuth();
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const checkMilestones = async () => {
      const [invoicesRes, clientsRes, appointmentsRes, horsesRes, completedRes] = await Promise.all([
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("provider_id", user.id),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("created_by_provider_id", user.id),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("provider_id", user.id),
        supabase.from("horses").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("provider_id", user.id).eq("status", "completed"),
      ]);

      const counts: MilestoneCounts = {
        invoices: invoicesRes.count ?? 0,
        clients: clientsRes.count ?? 0,
        appointments: appointmentsRes.count ?? 0,
        horses: horsesRes.count ?? 0,
        completedAppointments: completedRes.count ?? 0,
      };

      const unseen = milestones.find(
        (m) => m.check(counts) && !localStorage.getItem(STORAGE_PREFIX + m.id)
      );

      if (unseen) {
        setActiveMilestone(unseen);
        setShowConfetti(true);
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          dismiss(unseen);
        }, 5000);
      }
    };

    checkMilestones();
  }, [user?.id]);

  const dismiss = (milestone?: Milestone) => {
    const m = milestone || activeMilestone;
    if (m) {
      localStorage.setItem(STORAGE_PREFIX + m.id, "1");
    }
    setActiveMilestone(null);
    setShowConfetti(false);
  };

  return (
    <>
      {showConfetti && <ConfettiEffect duration={3000} />}
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
              <button onClick={() => dismiss()} className="shrink-0 text-muted-foreground hover:text-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
