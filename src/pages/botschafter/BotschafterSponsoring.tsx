import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function BotschafterSponsoring() {
  const { user } = useAuth();
  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [published, setPublished] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, referral_code, first_name, last_name, type, public_display_name, bio, company_name, discount_code, sponsoring_page_published")
      .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
      .in("status", ["active", "pending"])
      .maybeSingle();

    if (data) {
      setBot(data);
      setDisplayName((data as any).public_display_name || `${data.first_name} ${data.last_name}`);
      setBio((data as any).bio || "");
      setCompanyName(data.company_name || "");
      setDiscountCode((data as any).discount_code || "");
      setPublished(!!(data as any).sponsoring_page_published);
    }
    setLoading(false);
  };

  const save = async () => {
    if (!bot) return;
    setSaving(true);
    await supabase
      .from("pferdeakte_botschafter")
      .update({
        public_display_name: displayName,
        bio,
        company_name: companyName || null,
        discount_code: discountCode || null,
        sponsoring_page_published: published,
      } as any)
      .eq("id", bot.id);
    setSaving(false);
    toast.success("Gespeichert!");
  };

  const generateBio = async () => {
    setGenerating(true);
    try {
      const { data: result } = await supabase.functions.invoke("generate-werbemittel", {
        body: {
          prompt: `Persönlicher Text für eine Sponsoring-Seite eines HufManager Botschafters namens ${displayName}. Typ: ${bot?.type}. Kurz, authentisch, 2-3 Sätze.`,
          audiences: "Pferdebesitzer",
          tone: "Persönlich & authentisch",
        },
      });
      const variants = result?.variants;
      if (variants?.[0]?.subtext) {
        setBio(variants[0].subtext);
        toast.success("Text generiert!");
      }
    } catch {
      toast.error("Fehler bei der Generierung");
    }
    setGenerating(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} /></div>;
  if (!bot) return null;

  const sponsoringUrl = `${window.location.origin}/ref/${bot.referral_code}`;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🌐 Deine Sponsoring-Seite</h1>
        {published && (
          <a href={sponsoringUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#F5970A" }}>
            <Eye className="w-3 h-3" /> Vorschau <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "#9ca3af" }}>Anzeigename</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="bg-[#0a0700] border-[#2a2a1f] text-white" />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "#9ca3af" }}>Persönlicher Text</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={4}
              className="w-full rounded-lg p-3 text-sm resize-none bg-[#0a0700] border border-[#2a2a1f] text-white focus:outline-none focus:border-[#F5970A]"
              placeholder="Warum empfiehlst du HufManager?"
            />
            <Button size="sm" variant="ghost" onClick={generateBio} disabled={generating} className="mt-1 text-xs" style={{ color: "#F5970A" }}>
              <Sparkles className="w-3 h-3 mr-1" /> {generating ? "Generiert..." : "Text mit KI generieren"}
            </Button>
          </div>

          {bot.type === "unternehmen" && (
            <>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "#9ca3af" }}>Firmenname</label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="bg-[#0a0700] border-[#2a2a1f] text-white" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "#9ca3af" }}>Rabattcode (optional)</label>
                <Input value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="z.B. REITVEREIN10" className="bg-[#0a0700] border-[#2a2a1f] text-white" />
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Veröffentlicht</label>
            <button
              onClick={() => setPublished(!published)}
              className="w-10 h-6 rounded-full transition-colors relative"
              style={{ backgroundColor: published ? "#F5970A" : "#2a2a1f" }}
            >
              <div
                className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                style={{ left: published ? "22px" : "4px" }}
              />
            </button>
          </div>

          <Button onClick={save} disabled={saving} className="w-full" style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>
            {saving ? "Speichert..." : "Änderungen speichern"}
          </Button>
        </CardContent>
      </Card>

      {published && (
        <div className="text-center text-xs" style={{ color: "#6b7280" }}>
          Deine Seite: <code style={{ color: "#F5970A" }}>{sponsoringUrl}</code>
        </div>
      )}
    </div>
  );
}
