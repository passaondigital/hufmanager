import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const DISMISSED_KEY = "hm_quickwin_dismissed";

export function QuickWinBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    // Check localStorage first
    if (localStorage.getItem(`${DISMISSED_KEY}_${user.id}`)) {
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        // Check client count
        const { count: clientCount } = await supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", user.id)
          .eq("category", "client");

        // Check if any client has logged in (active app user)
        const { count: activeCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("created_by_provider_id", user.id)
          .eq("has_logged_in", true);

        // Show banner if < 3 clients OR no active app users
        if ((clientCount ?? 0) < 3 && (activeCount ?? 0) === 0) {
          setShow(true);
        }
      } catch (err) {
        console.error("QuickWinBanner check error:", err);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user?.id]);

  const dismiss = () => {
    setShow(false);
    if (user?.id) {
      localStorage.setItem(`${DISMISSED_KEY}_${user.id}`, "true");
    }
  };

  if (loading || !show) return null;

  return (
    <div className="relative flex items-center gap-3 p-3 rounded-xl bg-[#F5970A]/10 border border-[#F5970A]/30">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#F5970A]/20 flex items-center justify-center">
        <Lightbulb className="h-5 w-5 text-[#F5970A]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Tipp: Lade jetzt deinen ersten Kunden zur App ein – dauert 10 Sekunden.
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => navigate("/customers")}
        className="flex-shrink-0 gap-1.5 bg-[#F5970A] hover:bg-[#E08A09] text-white"
      >
        <MessageCircle className="h-4 w-4" />
        Einladen
      </Button>
      <button
        onClick={dismiss}
        className="flex-shrink-0 p-1 rounded-full hover:bg-muted/50 text-muted-foreground"
        aria-label="Schließen"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
