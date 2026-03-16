import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Check } from "lucide-react";

export default function BotschafterHufmanager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) checkProfile();
  }, [user?.id]);

  const checkProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user!.id)
      .maybeSingle();
    
    if (data && data.role) {
      setHasProfile(true);
      setProfileRole(data.role);
    } else {
      setHasProfile(false);
    }
    setLoading(false);
  };

  const goToDashboard = () => {
    if (profileRole === "provider") navigate("/home");
    else if (profileRole === "client") navigate("/client-home");
    else if (profileRole === "partner") navigate("/partner-home");
    else if (profileRole === "employee") navigate("/employee");
    else navigate("/home");
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} /></div>;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold">🐴 HufManager-Account</h1>

      {hasProfile ? (
        <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" style={{ color: "#22c55e" }} />
              <p className="font-medium">Du hast bereits einen HufManager-Account</p>
            </div>
            <p className="text-sm" style={{ color: "#9ca3af" }}>
              Rolle: {profileRole === "provider" ? "Hufbearbeiter" : profileRole === "client" ? "Pferdebesitzer" : profileRole === "partner" ? "Fachpartner" : profileRole}
            </p>
            <Button onClick={goToDashboard} style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>
              Zum HufManager Dashboard →
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm" style={{ color: "#d1d5db" }}>
              Als Botschafter nutzt du HufManager kostenlos mit erweiterter Trial-Phase (90 statt 30 Tage).
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Hufbearbeiter", emoji: "🔨" },
                { label: "Pferdebesitzer", emoji: "🐴" },
                { label: "Fachpartner", emoji: "🤝" },
              ].map(role => (
                <button
                  key={role.label}
                  onClick={() => navigate("/auth")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:border-[#F5970A]"
                  style={{ borderColor: "#2a2a1f", backgroundColor: "#0a0700" }}
                >
                  <span className="text-2xl">{role.emoji}</span>
                  <span className="text-xs font-medium">{role.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2 text-xs" style={{ color: "#9ca3af" }}>
              <p className="font-medium" style={{ color: "#F5970A" }}>💡 Botschafter-Vorteile im HufManager:</p>
              <p>✓ 90 Tage Trial (statt 30)</p>
              <p>✓ "Botschafter" Badge im Profil</p>
              <p>✓ Zugang zu Beta-Features</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
