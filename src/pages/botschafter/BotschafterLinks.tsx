import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Plus, QrCode, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function BotschafterLinks() {
  const { user } = useAuth();
  const [botschafter, setBotschafter] = useState<{ id: string; referral_code: string } | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const { data: bot } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, referral_code")
      .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
      .eq("status", "active")
      .maybeSingle();

    if (bot) {
      setBotschafter(bot);
      const { data: camps } = await supabase
        .from("botschafter_campaigns")
        .select("*")
        .eq("botschafter_id", bot.id)
        .order("created_at", { ascending: false });
      setCampaigns(camps || []);
    }
    setLoading(false);
  };

  const createCampaign = async () => {
    if (!newName.trim() || !newTag.trim() || !botschafter) return;
    const tag = newTag.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const { data, error } = await supabase
      .from("botschafter_campaigns")
      .insert({ botschafter_id: botschafter.id, campaign_name: newName.trim(), source_tag: tag })
      .select()
      .single();
    if (!error && data) {
      setCampaigns(prev => [data, ...prev]);
      setShowNew(false);
      setNewName("");
      setNewTag("");
      toast.success("Kampagne erstellt!");
    }
  };

  const copyLink = (src?: string) => {
    if (!botschafter) return;
    const link = src
      ? `${window.location.origin}/?ref=${botschafter.referral_code}&src=${src}`
      : `${window.location.origin}/?ref=${botschafter.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link kopiert!");
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} /></div>;
  if (!botschafter) return null;

  const mainLink = `${window.location.origin}/?ref=${botschafter.referral_code}`;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold">🔗 Meine Empfehlungslinks</h1>

      {/* Main Link */}
      <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium">Haupt-Link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs p-2.5 rounded-lg break-all" style={{ backgroundColor: "#0a0700", color: "#F5970A" }}>
              {mainLink}
            </code>
            <Button size="sm" onClick={() => copyLink()} style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Campaign */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Kampagnen-Links</h2>
        <Button size="sm" variant="outline" onClick={() => setShowNew(!showNew)} style={{ borderColor: "#F5970A", color: "#F5970A" }}>
          <Plus className="w-4 h-4 mr-1" /> Kampagnen-Link
        </Button>
      </div>

      {showNew && (
        <Card style={{ backgroundColor: "#1a1a12", borderColor: "#F5970A" }}>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Name (z.B. Instagram Bio)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="bg-[#0a0700] border-[#2a2a1f] text-white"
            />
            <Input
              placeholder="Quell-Tag (z.B. ig_bio)"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              className="bg-[#0a0700] border-[#2a2a1f] text-white"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={createCampaign} style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>Erstellen</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNew(false)} className="text-[#9ca3af]">Abbrechen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign List */}
      <div className="space-y-2">
        {campaigns.map(c => (
          <Card key={c.id} style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{c.campaign_name}</span>
                <Button size="sm" variant="ghost" onClick={() => copyLink(c.source_tag)} className="text-[#F5970A]">
                  <Copy className="w-3 h-3 mr-1" /> Kopieren
                </Button>
              </div>
              <code className="text-[11px] block mb-2 break-all" style={{ color: "#9ca3af" }}>
                {mainLink}&src={c.source_tag}
              </code>
              <div className="flex gap-4 text-xs" style={{ color: "#9ca3af" }}>
                <span>{c.clicks || 0} Klicks</span>
                <span>{c.registrations || 0} Registrierungen</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {campaigns.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: "#6b7280" }}>
            Noch keine Kampagnen. Erstelle deinen ersten Kampagnen-Link!
          </p>
        )}
      </div>
    </div>
  );
}
