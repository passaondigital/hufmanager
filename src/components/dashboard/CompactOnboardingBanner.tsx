import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { ChevronRight } from "lucide-react";

export function CompactOnboardingBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    const check = async () => {
      try {
        const [biz, services, clients, horses, appts, invoices] = await Promise.all([
          supabase.from("business_settings").select("business_name").eq("user_id", user.id).maybeSingle(),
          supabase.from("offers").select("id").eq("provider_id", user.id).limit(1),
          supabase.from("contacts").select("id").eq("provider_id", user.id).limit(1),
          (supabase as any).from("horses").select("id, contacts!inner(provider_id)").eq("contacts.provider_id", user.id).limit(1),
          supabase.from("appointments").select("id").eq("provider_id", user.id).limit(1),
          supabase.from("invoices").select("id").eq("provider_id", user.id).limit(1),
        ]);

        const steps = [
          !!biz.data?.business_name,
          (services.data?.length ?? 0) > 0,
          (clients.data?.length ?? 0) > 0,
          (horses.data?.length ?? 0) > 0,
          (appts.data?.length ?? 0) > 0,
          (invoices.data?.length ?? 0) > 0,
        ];

        const completed = steps.filter(Boolean).length;
        setProgress(Math.round((completed / steps.length) * 100));
      } catch {
        setProgress(null);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [user?.id]);

  if (loading || progress === null || progress >= 100) return null;

  // Over 30%: just a small indicator, user already knows
  if (progress > 30) return null;

  return (
    <button
      onClick={() => navigate("/services")}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
    >
      <span className="text-xs text-muted-foreground shrink-0">✦ Einrichtung</span>
      <Progress value={progress} className="h-1.5 flex-1" />
      <span className="text-xs font-medium text-foreground shrink-0">{progress}%</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}
