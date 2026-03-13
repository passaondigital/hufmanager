import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Sparkles, Copy, Star, Download, Pencil, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

type Werbemittel = {
  id: string;
  category: string;
  title: string;
  content: string;
  target_audience: string | null;
};

type Asset = {
  id: string;
  created_at: string | null;
  asset_type: string;
  title: string | null;
  canvas_data: Record<string, string> | null;
  is_favorite: boolean | null;
  prompt_used: string | null;
};

const CAT_COLORS: Record<string, string> = {
  email: "bg-blue-500/20 text-blue-400",
  whatsapp: "bg-green-500/20 text-green-400",
  instagram: "bg-pink-500/20 text-pink-400",
  facebook: "bg-indigo-500/20 text-indigo-400",
  text: "bg-muted text-muted-foreground",
  image: "bg-yellow-500/20 text-yellow-400",
};

export default function BotschafterWerbemittelPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [botschafter, setBotschafter] = useState<{ id: string; referral_code: string } | null>(null);
  const [templates, setTemplates] = useState<Werbemittel[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadAll();
  }, [user?.id]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: botData }, { data: tplData }] = await Promise.all([
      supabase.from("pferdeakte_botschafter").select("id, referral_code").eq("user_id", user!.id).eq("status", "active").maybeSingle(),
      supabase.from("botschafter_werbemittel").select("id, category, title, content, target_audience").eq("is_active", true).order("sort_order"),
    ]);
    setBotschafter(botData);
    setTemplates(tplData || []);

    if (botData) {
      const { data: assetData } = await supabase.from("botschafter_assets")
        .select("id, created_at, asset_type, title, canvas_data, is_favorite, prompt_used")
        .eq("botschafter_id", botData.id)
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });
      setAssets((assetData || []) as Asset[]);
    }
    setLoading(false);
  };

  const copyContent = (content: string) => {
    const replaced = botschafter ? content.replace(/\{\{CODE\}\}/g, botschafter.referral_code) : content;
    navigator.clipboard.writeText(replaced);
    toast.success("In Zwischenablage kopiert!");
  };

  const toggleFavorite = async (id: string, current: boolean) => {
    await supabase.from("botschafter_assets").update({ is_favorite: !current }).eq("id", id);
    setAssets(prev => prev.map(a => a.id === id ? { ...a, is_favorite: !current } : a));
  };

  const deleteAsset = async (id: string) => {
    if (!confirm("Werbemittel löschen?")) return;
    await supabase.from("botschafter_assets").delete().eq("id", id);
    setAssets(prev => prev.filter(a => a.id !== id));
    toast.success("Gelöscht");
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
          <h1 className="text-2xl font-bold">Werbemittel</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/botschafter/nachrichten")}>
            <MessageCircle className="w-4 h-4 mr-2" /> Nachrichten
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => navigate("/botschafter/werbemittel/erstellen")}>
            <Sparkles className="w-4 h-4 mr-2" /> Eigenes Werbemittel erstellen
          </Button>
        </div>
      </div>

      <Tabs defaultValue="vorlagen">
        <TabsList>
          <TabsTrigger value="vorlagen">Vorlagen</TabsTrigger>
          <TabsTrigger value="assets">Meine Assets {assets.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{assets.length}</Badge>}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Templates */}
        <TabsContent value="vorlagen" className="space-y-3 mt-4">
          {templates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Keine Vorlagen verfügbar</p>
          ) : templates.map(tpl => (
            <Card key={tpl.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[tpl.category] || ""}`}>{tpl.category}</span>
                      {tpl.target_audience && <Badge variant="outline" className="text-xs">{tpl.target_audience}</Badge>}
                    </div>
                    <h3 className="font-bold">{tpl.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line line-clamp-3">{tpl.content}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyContent(tpl.content)}>
                    <Copy className="w-3 h-3 mr-1" /> Kopieren
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 2: My Assets */}
        <TabsContent value="assets" className="mt-4">
          {assets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">✨</div>
              <h3 className="text-lg font-bold">Noch keine eigenen Werbemittel</h3>
              <p className="text-muted-foreground mt-1">Erstelle dein erstes Werbemittel mit dem KI-Generator</p>
              <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => navigate("/botschafter/werbemittel/erstellen")}>
                Jetzt erstellen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {assets.map(asset => {
                const bg = (asset.canvas_data as any)?.backgroundColor || "#f97316";
                return (
                  <Card key={asset.id} className="overflow-hidden group">
                    <div className="aspect-square flex items-center justify-center text-xs font-bold uppercase tracking-wider relative" style={{ backgroundColor: bg, color: bg === "#ffffff" || bg === "#f9fafb" ? "#0a0a0a" : "#ffffff" }}>
                      {asset.asset_type}
                      <button onClick={() => toggleFavorite(asset.id, !!asset.is_favorite)} className="absolute top-2 right-2">
                        <Star className={`w-4 h-4 ${asset.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-white/50"}`} />
                      </button>
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm truncate">{asset.title || "Unbenannt"}</p>
                      <p className="text-xs text-muted-foreground">{asset.created_at ? new Date(asset.created_at).toLocaleDateString("de") : ""}</p>
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => navigate(`/botschafter/werbemittel/erstellen?asset=${asset.id}`)}>
                          <Pencil className="w-3 h-3 mr-1" /> Bearbeiten
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => deleteAsset(asset.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
