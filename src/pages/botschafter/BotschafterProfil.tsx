import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const COPECART_SIGNUP = "https://copecart.com/users/sign_up?cp=barhufserviceschmid&language=de";

export default function BotschafterProfil() {
  const { user } = useAuth();
  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [copecartEmail, setCopecartEmail] = useState("");
  const [listedPublicly, setListedPublicly] = useState(false);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pferdeakte_botschafter")
      .select("*")
      .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
      .eq("status", "active")
      .maybeSingle();
    if (data) {
      setBot(data);
      setFirstName(data.first_name);
      setLastName(data.last_name);
      setPhone(data.phone || "");
      setSocialHandle(data.social_handle || "");
      setCopecartEmail(data.copecart_username || "");
      setListedPublicly(!!data.listed_publicly);
    }
    setLoading(false);
  };

  const save = async () => {
    if (!bot) return;
    setSaving(true);
    await supabase
      .from("pferdeakte_botschafter")
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        social_handle: socialHandle || null,
        copecart_username: copecartEmail || null,
        listed_publicly: listedPublicly,
      } as any)
      .eq("id", bot.id);
    setSaving(false);
    toast.success("Profil gespeichert!");
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} /></div>;
  if (!bot) return null;

  const typeLabel = bot.type === "creator" ? "Creator / Influencer" : bot.type === "profi" ? "Pferdeprofi / Dienstleister" : "Unternehmen / Verband";

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold">👤 Profil & Einstellungen</h1>

      <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>{typeLabel}</Badge>
            <Badge variant="outline" className="font-mono text-xs" style={{ borderColor: "#2a2a1f", color: "#9ca3af" }}>
              BID: {(bot.bid || bot.id).slice(0, 8).toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "#9ca3af" }}>Vorname</label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-[#0a0700] border-[#2a2a1f] text-white" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "#9ca3af" }}>Nachname</label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} className="bg-[#0a0700] border-[#2a2a1f] text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "#9ca3af" }}>Telefon</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-[#0a0700] border-[#2a2a1f] text-white" />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "#9ca3af" }}>Social Handle</label>
            <Input value={socialHandle} onChange={e => setSocialHandle(e.target.value)} placeholder="@dein_handle" className="bg-[#0a0700] border-[#2a2a1f] text-white" />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "#9ca3af" }}>
              CopeCart-E-Mail
              <a href={COPECART_SIGNUP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ml-2 hover:underline" style={{ color: "#F5970A" }}>
                Konto erstellen <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <Input value={copecartEmail} onChange={e => setCopecartEmail(e.target.value)} placeholder="deine@copecart-email.de" className="bg-[#0a0700] border-[#2a2a1f] text-white" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm">In Rangliste anzeigen</label>
            <button
              onClick={() => setListedPublicly(!listedPublicly)}
              className="w-10 h-6 rounded-full transition-colors relative"
              style={{ backgroundColor: listedPublicly ? "#F5970A" : "#2a2a1f" }}
            >
              <div className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all" style={{ left: listedPublicly ? "22px" : "4px" }} />
            </button>
          </div>

          <Button onClick={save} disabled={saving} className="w-full" style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>
            {saving ? "Speichert..." : "Profil speichern"}
          </Button>
        </CardContent>
      </Card>

      <div className="text-center text-xs" style={{ color: "#6b7280" }}>
        Referral-Code: <code style={{ color: "#F5970A" }}>{bot.referral_code}</code>
      </div>
    </div>
  );
}
