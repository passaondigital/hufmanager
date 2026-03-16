import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";

export default function SponsoringPublic() {
  const { code } = useParams<{ code: string }>();
  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (code) loadProfile();
  }, [code]);

  const loadProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, referral_code, first_name, type, public_display_name, bio, company_name, discount_code, sponsoring_page_published")
      .eq("referral_code", code!.toUpperCase())
      .eq("status", "active")
      .maybeSingle();

    if (data && (data as any).sponsoring_page_published) {
      setBot(data);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0a0700" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#0a0700", color: "#fafaf9" }}>
      <p className="text-lg">Seite nicht gefunden</p>
      <Link to="/" className="text-sm hover:underline" style={{ color: "#F5970A" }}>Zur Startseite</Link>
    </div>
  );

  const displayName = (bot as any).public_display_name || bot.first_name;
  const typeLabel = bot.type === "creator" ? "Creator" : bot.type === "profi" ? "Hufbearbeiter" : "Unternehmen";
  const ctaLink = `/auth?ref=${bot.referral_code}`;
  const features = [
    "Kostenlose Pferdeakte",
    "QR-Notfall-Code am Stall",
    "Hufbearbeiter + Tierarzt + Osteo vernetzt",
    "Tresor für deine Dokumente",
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0700", color: "#fafaf9" }}>
      <div className="max-w-lg mx-auto px-6 py-16 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl" style={{ backgroundColor: "#1a1a12", border: "2px solid #F5970A" }}>
            {bot.type === "creator" ? "🎙️" : bot.type === "profi" ? "🔨" : "🏢"}
          </div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm" style={{ color: "#9ca3af" }}>{typeLabel} · empfiehlt HufManager</p>
        </div>

        {/* Bio */}
        {(bot as any).bio && (
          <blockquote className="text-center text-sm italic px-4" style={{ color: "#d1d5db", borderLeft: "3px solid #F5970A", paddingLeft: "16px", textAlign: "left" }}>
            "{(bot as any).bio}"
          </blockquote>
        )}

        {/* Features */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-center">Was ist HufManager?</h2>
          <div className="space-y-2">
            {features.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm" style={{ color: "#d1d5db" }}>
                <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#F5970A" }} />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to={ctaLink}>
            <Button size="lg" className="text-base px-8" style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>
              Jetzt kostenlos starten →
            </Button>
          </Link>
        </div>

        {/* Business extras */}
        {bot.type === "unternehmen" && bot.company_name && (
          <div className="text-center space-y-2 pt-4 border-t" style={{ borderColor: "#2a2a1f" }}>
            <p className="text-xs" style={{ color: "#6b7280" }}>Empfohlen von</p>
            <p className="font-semibold">{bot.company_name}</p>
            {(bot as any).discount_code && (
              <p className="text-sm">
                Rabattcode: <code className="font-bold" style={{ color: "#F5970A" }}>{(bot as any).discount_code}</code>
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8">
          <Link to="/" className="text-xs hover:underline" style={{ color: "#6b7280" }}>
            © HufManager · hufmanager.de
          </Link>
        </div>
      </div>
    </div>
  );
}
