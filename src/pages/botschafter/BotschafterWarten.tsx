import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type BotschafterInfo = {
  id: string;
  bid: string | null;
  referral_code: string;
  status: string | null;
};

export default function BotschafterWarten() {
  const navigate = useNavigate();
  const [data, setData] = useState<BotschafterInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      // Zuerst per user_id suchen, falls nicht gefunden per E-Mail
      const { data: bot } = await supabase
        .from("pferdeakte_botschafter")
        .select("id, bid, referral_code, status, user_id")
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle();
      
      if (bot) {
        // user_id nachträglich setzen falls per E-Mail gefunden
        if (!bot.user_id || bot.user_id !== user.id) {
          await supabase
            .from("pferdeakte_botschafter")
            .update({ user_id: user.id } as any)
            .eq("id", bot.id);
        }
        // If already active, redirect to dashboard
        if (bot.status === "active") {
          navigate("/botschafter/dashboard", { replace: true });
          return;
        }
        setData(bot as BotschafterInfo);
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/botschafter/login", { replace: true });
  };

  const bidDisplay = data ? (data.bid || data.id).slice(0, 8).toUpperCase() : "";

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans" style={{ color: "#0a0a0a" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-zinc-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-12 h-16">
          <Link to="/pferdeakte" className="text-sm font-medium hover:text-[#f97316] transition-colors" style={{ color: "#6b7280" }}>
            ← Zur Pferdeakte
          </Link>
          <span className="text-xl font-bold tracking-tight">HufManager</span>
          <div className="w-24" />
        </div>
      </nav>

      <div className="flex items-center justify-center py-16 px-6">
        <div className="w-full max-w-[480px]">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f97316" }} />
            </div>
          ) : !data ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 text-center">
              <p className="text-5xl mb-4">🔒</p>
              <h2 className="text-xl font-bold mb-2">Kein Zugang</h2>
              <p className="text-sm mb-4" style={{ color: "#6b7280" }}>
                Du hast noch keine Botschafter-Registrierung.
              </p>
              <Link
                to="/botschafter/login"
                className="inline-flex h-10 items-center px-5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: "#f97316" }}
              >
                Zur Registrierung →
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 text-center space-y-6">
              {/* Icon */}
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: "#fff7ed" }}>
                <span className="text-4xl">🎙️</span>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold mb-2">Registrierung eingegangen!</h2>
                <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
                  Pascal prüft deine Anfrage persönlich und schaltet dich in der Regel innerhalb von 24 Stunden frei.
                  Du erhältst eine E-Mail sobald dein Zugang aktiv ist.
                </p>
              </div>

              {/* BID */}
              <div>
                <p className="text-xs mb-1" style={{ color: "#9ca3af" }}>Deine #BID</p>
                <Badge variant="outline" className="font-mono text-base px-4 py-1">
                  BID-{bidDisplay}
                </Badge>
              </div>

              {/* Referral hint */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#f9fafb" }}>
                <p className="text-sm" style={{ color: "#6b7280" }}>
                  Schon neugierig? Auf der Pferdeakte Launchpage kannst du deinen Referral-Link bereits teilen:
                </p>
                <Link
                  to="/pferdeakte"
                  className="inline-flex items-center mt-3 h-10 px-5 rounded-full text-sm font-bold text-white transition-all hover:brightness-110"
                  style={{ backgroundColor: "#f97316" }}
                >
                  Zur Launchpage →
                </Link>
              </div>

              {/* Logout */}
              <button onClick={handleLogout} className="text-xs hover:underline" style={{ color: "#9ca3af" }}>
                Ausloggen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
