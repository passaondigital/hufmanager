import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Copy, Download, Share2, Star, Pencil, Trash2, Code2, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

// ── Template definitions ──
type TemplateConfig = {
  id: string;
  name: string;
  category: "instagram_post" | "instagram_story" | "facebook" | "flyer_a4";
  width: number;
  height: number;
  headline: string[];
  cta: string;
  bg: string;
  textColor: string;
  accentColor: string;
};

const TEMPLATES: TemplateConfig[] = [
  { id: "ig_pferdeakte", name: "Pferdeakte", category: "instagram_post", width: 1080, height: 1080, headline: ["Dein Pferd.", "Deine Daten.", "Endlich sicher."], cta: "Kostenlos starten", bg: "#0a0700", textColor: "#ffffff", accentColor: "#F5970A" },
  { id: "ig_tresor", name: "Tresor", category: "instagram_post", width: 1080, height: 1080, headline: ["Kaufvertrag?", "Equidenpass?", "Alles im Tresor."], cta: "Ab 2,99€/Monat", bg: "#0a0700", textColor: "#ffffff", accentColor: "#F5970A" },
  { id: "ig_notfall", name: "QR-Notfall", category: "instagram_post", width: 1080, height: 1080, headline: ["Im Notfall", "zählt jede", "Sekunde."], cta: "QR-Code am Stall", bg: "#1a0000", textColor: "#ffffff", accentColor: "#ef4444" },
  { id: "ig_team", name: "Teamwork", category: "instagram_post", width: 1080, height: 1080, headline: ["Hufbearbeiter.", "Tierarzt. Osteo.", "Eine Akte."], cta: "Kostenlos vernetzen", bg: "#0a0700", textColor: "#ffffff", accentColor: "#F5970A" },
  { id: "story_pferdeakte", name: "Story: Pferdeakte", category: "instagram_story", width: 1080, height: 1920, headline: ["Alles zu deinem", "Pferd. An einem Ort."], cta: "Link in Bio ↑", bg: "#0a0700", textColor: "#ffffff", accentColor: "#F5970A" },
  { id: "story_stats", name: "Story: Statistik", category: "instagram_story", width: 1080, height: 1920, headline: ["2.100+ Pferdeakten.", "380+ Dienstleister.", "Werde Teil davon."], cta: "Jetzt starten", bg: "#0a0700", textColor: "#ffffff", accentColor: "#F5970A" },
  { id: "fb_overview", name: "Facebook: Übersicht", category: "facebook", width: 1200, height: 630, headline: ["Die digitale Pferdeakte", "Kostenlos. Sicher. Vernetzt."], cta: "Mehr erfahren", bg: "#0a0700", textColor: "#ffffff", accentColor: "#F5970A" },
  { id: "flyer_a4", name: "Flyer A4", category: "flyer_a4", width: 2480, height: 3508, headline: ["Alles zu deinem Pferd.", "An einem Ort."], cta: "hufmanager.de/pferdeakte", bg: "#0a0700", textColor: "#ffffff", accentColor: "#F5970A" },
];

const CATEGORY_LABELS: Record<string, string> = {
  instagram_post: "Instagram Posts (1080×1080)",
  instagram_story: "Instagram Stories (1080×1920)",
  facebook: "Facebook / LinkedIn (1200×630)",
  flyer_a4: "Flyer & Print",
};

const BANNER_SIZES = [
  { label: "300×250", w: 300, h: 250 },
  { label: "728×90", w: 728, h: 90 },
  { label: "160×600", w: 160, h: 600 },
];

type Asset = {
  id: string;
  created_at: string | null;
  asset_type: string;
  title: string | null;
  canvas_data: Record<string, string> | null;
  is_favorite: boolean | null;
};

export default function BotschafterWerbemittelPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [botschafter, setBotschafter] = useState<{ id: string; referral_code: string; first_name: string } | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState<TemplateConfig | null>(null);
  const [bannerSize, setBannerSize] = useState(BANNER_SIZES[0]);

  // Editor state
  const [editorHeadline, setEditorHeadline] = useState<string[]>([]);
  const [editorCta, setEditorCta] = useState("");
  const [editorName, setEditorName] = useState("");
  const [editorDark, setEditorDark] = useState(true);
  const [editorHashtags, setEditorHashtags] = useState(["#Pferdeakte", "#HufManager", "#ZukunftHuf2030"]);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) loadAll();
  }, [user?.id]);

  const loadAll = async () => {
    setLoading(true);
    const { data: botData } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, referral_code, first_name")
      .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
      .in("status", ["active", "pending"])
      .maybeSingle();
    setBotschafter(botData as any);

    if (botData) {
      const { data: assetData } = await supabase.from("botschafter_assets")
        .select("id, created_at, asset_type, title, canvas_data, is_favorite")
        .eq("botschafter_id", botData.id)
        .order("created_at", { ascending: false });
      setAssets((assetData || []) as Asset[]);
    }
    setLoading(false);
  };

  const refCode = botschafter?.referral_code || "CODE";
  const refLink = `hufmanager.de/?ref=${refCode}`;
  const fullRefLink = `https://hufmanager.de/?ref=${refCode}`;

  const openEditor = (tpl: TemplateConfig) => {
    setEditTemplate(tpl);
    setEditorHeadline([...tpl.headline]);
    setEditorCta(tpl.cta);
    setEditorName(botschafter?.first_name || "");
    setEditorDark(tpl.bg === "#0a0700" || tpl.bg === "#1a0000");
  };

  const downloadTemplate = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `HufManager_${editTemplate?.id || "post"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("PNG heruntergeladen!");
    } catch {
      toast.error("Download fehlgeschlagen");
    }
  };

  const shareWhatsApp = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + fullRefLink)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullRefLink)}`, "_blank");
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullRefLink)}`, "_blank");
  };

  const shareTelegram = (text: string) => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(fullRefLink)}&text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareEmail = (subject: string, body: string) => {
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + "\n\n" + fullRefLink)}`, "_blank");
  };

  const copyWithText = () => {
    const text = editorHeadline.join(" ") + "\n\n" + editorCta + "\n\n" + fullRefLink + "\n\n" + editorHashtags.join(" ");
    navigator.clipboard.writeText(text);
    toast.success("Text + Link kopiert!");
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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code kopiert!");
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} /></div>;

  const groupedTemplates = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    category: cat,
    label,
    items: TEMPLATES.filter(t => t.category === cat),
  }));

  // Embed codes
  const bannerHtml = `<a href="${fullRefLink}" target="_blank" rel="noopener">\n  <img src="https://hufmanager.de/banner/${bannerSize.w}x${bannerSize.h}.png?ref=${refCode}" \n    alt="HufManager Pferdeakte" width="${bannerSize.w}" height="${bannerSize.h}" />\n</a>`;
  const widgetHtml = `<iframe src="https://hufmanager.de/widget/referral?ref=${refCode}" \n  width="300" height="400" frameborder="0" \n  style="border-radius:12px;border:none;"></iframe>`;
  const signatureHtml = `<table cellpadding="0" cellspacing="0"><tr>\n  <td style="padding-right:12px"><img src="https://hufmanager.de/logo/icon-60.png" width="60" height="60" alt="HufManager" /></td>\n  <td style="font-family:Arial,sans-serif;font-size:13px">\n    <b>Empfohlen: HufManager Pferdeakte</b><br>\n    Die digitale Akte für dein Pferd.<br>\n    <a href="${fullRefLink}" style="color:#F5970A">Kostenlos starten →</a>\n  </td>\n</tr></table>`;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">🎨 Werbemittel</h1>
        <Button size="sm" onClick={() => navigate("/botschafter/werbemittel/erstellen")}
          style={{ backgroundColor: "#F5970A", color: "#0a0700" }} className="hover:opacity-90">
          <Sparkles className="w-4 h-4 mr-1" /> KI-Generator
        </Button>
      </div>

      <Tabs defaultValue="vorlagen">
        <TabsList>
          <TabsTrigger value="vorlagen">Vorlagen</TabsTrigger>
          <TabsTrigger value="ki">KI-Generator</TabsTrigger>
          <TabsTrigger value="assets">Meine Designs {assets.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{assets.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="embed">Website & Embed</TabsTrigger>
        </TabsList>

        {/* ── Tab: Vorlagen ── */}
        <TabsContent value="vorlagen" className="space-y-6 mt-4">
          {groupedTemplates.map(group => (
            <div key={group.category}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#9ca3af" }}>── {group.label} ──</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {group.items.map(tpl => (
                  <Card key={tpl.id} className="overflow-hidden cursor-pointer hover:ring-1 transition-all" style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}
                    onClick={() => openEditor(tpl)}>
                    <div className="aspect-square flex flex-col items-center justify-center p-4 text-center relative"
                      style={{ backgroundColor: tpl.bg, color: tpl.textColor }}>
                      <div className="text-xs font-bold leading-tight space-y-0.5">
                        {tpl.headline.map((line, i) => <div key={i}>{line}</div>)}
                      </div>
                      <div className="mt-2 px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: tpl.accentColor, color: "#0a0700" }}>
                        {tpl.cta}
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium truncate">{tpl.name}</p>
                      <Button size="sm" variant="outline" className="w-full mt-1 h-7 text-xs" style={{ borderColor: "#F5970A", color: "#F5970A" }}>
                        <Pencil className="w-3 h-3 mr-1" /> Anpassen
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Textvorlagen */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#9ca3af" }}>── Textvorlagen ──</h3>
            <div className="space-y-2">
              {[
                { label: "WhatsApp-Nachricht", icon: "💬", text: `Hey! Ich nutze die digitale Pferdeakte von HufManager – kostenlos und mega praktisch für alle Pferdeinfos an einem Ort. Schau mal: ${fullRefLink}` },
                { label: "Instagram Caption", icon: "📸", text: `🐴 Dein Pferd. Deine Daten. Endlich sicher.\n\nDie HufManager Pferdeakte ist kostenlos und verbindet dich mit Hufbearbeiter, Tierarzt und Osteo.\n\n➡️ Link in Bio\n\n#Pferdeakte #HufManager #ZukunftHuf2030 #Pferde` },
                { label: "E-Mail-Vorlage", icon: "📧", text: `Betreff: Kennst du schon die digitale Pferdeakte?\n\nHallo,\n\nich möchte dir HufManager vorstellen – die kostenlose digitale Pferdeakte. Alle Daten deines Pferdes an einem Ort, sicher geteilt mit deinem Hufbearbeiter und Tierarzt.\n\nSchau mal hier: ${fullRefLink}\n\nLiebe Grüße` },
              ].map(item => (
                <Card key={item.label} style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(item.text); toast.success("Kopiert!"); }}
                      style={{ borderColor: "#F5970A", color: "#F5970A" }}>
                      <Copy className="w-3 h-3 mr-1" /> Kopieren
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: KI-Generator (redirect) ── */}
        <TabsContent value="ki" className="mt-4">
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: "#F5970A" }} />
            <h3 className="text-lg font-bold mb-2">KI-Werbemittel erstellen</h3>
            <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>
              Erstelle individuelle Werbemittel mit KI-generierten Texten und Vorlagen.
            </p>
            <Button onClick={() => navigate("/botschafter/werbemittel/erstellen")}
              style={{ backgroundColor: "#F5970A", color: "#0a0700" }} className="hover:opacity-90">
              <Sparkles className="w-4 h-4 mr-2" /> KI-Generator öffnen
            </Button>
          </div>
        </TabsContent>

        {/* ── Tab: Meine Designs ── */}
        <TabsContent value="assets" className="mt-4">
          {assets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">✨</div>
              <h3 className="text-lg font-bold">Noch keine eigenen Werbemittel</h3>
              <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Erstelle dein erstes Werbemittel</p>
              <Button className="mt-4" onClick={() => navigate("/botschafter/werbemittel/erstellen")}
                style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>
                Jetzt erstellen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {assets.map(asset => (
                <Card key={asset.id} className="overflow-hidden" style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
                  <div className="aspect-square flex items-center justify-center text-xs font-bold uppercase tracking-wider relative"
                    style={{ backgroundColor: (asset.canvas_data as any)?.backgroundColor || "#F5970A", color: "#ffffff" }}>
                    {asset.asset_type}
                    <button onClick={() => toggleFavorite(asset.id, !!asset.is_favorite)} className="absolute top-2 right-2">
                      <Star className={`w-4 h-4 ${asset.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-white/50"}`} />
                    </button>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">{asset.title || "Unbenannt"}</p>
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
                        onClick={() => navigate(`/botschafter/werbemittel/erstellen?asset=${asset.id}`)}>
                        <Pencil className="w-3 h-3 mr-1" /> Bearbeiten
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => deleteAsset(asset.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Website & Embed ── */}
        <TabsContent value="embed" className="space-y-6 mt-4">
          {/* Banner */}
          <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">🌐 Banner für deine Website</h3>
              <div className="flex gap-2 flex-wrap">
                {BANNER_SIZES.map(s => (
                  <button key={s.label} onClick={() => setBannerSize(s)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${bannerSize.label === s.label ? "ring-1" : ""}`}
                    style={{ backgroundColor: bannerSize.label === s.label ? "rgba(245,151,10,0.15)" : "#0a0700", color: "#F5970A", borderColor: "#F5970A" }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="p-3 rounded flex items-center justify-center" style={{ backgroundColor: "#0a0700", minHeight: 100 }}>
                <div className="text-center text-xs" style={{ color: "#F5970A", width: Math.min(bannerSize.w, 300), height: Math.min(bannerSize.h, 200) }}>
                  <p className="font-bold">HufManager</p>
                  <p>Die digitale Pferdeakte</p>
                  <p className="mt-1">[Kostenlos starten]</p>
                </div>
              </div>
              <div className="relative">
                <pre className="text-[11px] p-3 rounded overflow-x-auto" style={{ backgroundColor: "#0a0700", color: "#d1d5db" }}>{bannerHtml}</pre>
                <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-7" onClick={() => copyCode(bannerHtml)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Widget */}
          <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">📦 Sidebar-Widget</h3>
              <p className="text-xs" style={{ color: "#9ca3af" }}>Für WordPress, Blogs oder jede Website mit Sidebar.</p>
              <div className="relative">
                <pre className="text-[11px] p-3 rounded overflow-x-auto" style={{ backgroundColor: "#0a0700", color: "#d1d5db" }}>{widgetHtml}</pre>
                <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-7" onClick={() => copyCode(widgetHtml)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* E-Mail Signature */}
          <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">📧 Newsletter-Signatur</h3>
              <p className="text-xs" style={{ color: "#9ca3af" }}>HTML für E-Mail-Signaturen in Outlook, Gmail etc.</p>
              <div className="p-3 rounded" style={{ backgroundColor: "#ffffff" }}>
                <table cellPadding={0} cellSpacing={0}><tbody><tr>
                  <td style={{ paddingRight: 12 }}>
                    <div className="w-[60px] h-[60px] rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: "#F5970A" }}>🐴</div>
                  </td>
                  <td style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "#333" }}>
                    <b>Empfohlen: HufManager Pferdeakte</b><br />
                    Die digitale Akte für dein Pferd.<br />
                    <a href={fullRefLink} style={{ color: "#F5970A" }}>Kostenlos starten →</a>
                  </td>
                </tr></tbody></table>
              </div>
              <div className="relative">
                <pre className="text-[11px] p-3 rounded overflow-x-auto" style={{ backgroundColor: "#0a0700", color: "#d1d5db" }}>{signatureHtml}</pre>
                <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-7" onClick={() => copyCode(signatureHtml)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* WordPress Coming Soon */}
          <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-1">🔌 WordPress Plugin (Coming Soon)</h3>
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                Ein Plugin das die Pferdeakte direkt in deinen WordPress-Blog einbindet.
              </p>
              <Button size="sm" variant="outline" className="mt-2" style={{ borderColor: "#F5970A", color: "#F5970A" }}
                onClick={() => toast.info("Interesse wurde registriert!")}>
                Interesse anmelden
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Template Editor Dialog ── */}
      <Dialog open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "#111", borderColor: "#2a2a1f" }}>
          <DialogHeader>
            <DialogTitle className="text-sm">✏️ Vorlage anpassen: {editTemplate?.name}</DialogTitle>
          </DialogHeader>
          {editTemplate && (
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Live Preview */}
              <div className="flex-1 flex items-center justify-center">
                <div ref={previewRef}
                  className="relative flex flex-col items-center justify-center p-8 text-center"
                  style={{
                    width: Math.min(400, editTemplate.width / (editTemplate.width / 400)),
                    aspectRatio: `${editTemplate.width} / ${editTemplate.height}`,
                    backgroundColor: editorDark ? "#0a0700" : "#ffffff",
                    color: editorDark ? "#ffffff" : "#0a0700",
                    maxHeight: 500,
                  }}>
                  <div className="space-y-1 text-lg font-bold leading-tight">
                    {editorHeadline.map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                  <div className="mt-4 px-4 py-1.5 rounded-lg text-sm font-bold"
                    style={{ backgroundColor: editTemplate.accentColor, color: "#0a0700" }}>
                    {editorCta}
                  </div>
                  <p className="mt-4 text-[10px] opacity-60">{refLink}</p>
                  {editorName && (
                    <p className="mt-2 text-[10px] opacity-50">Empfohlen von {editorName}</p>
                  )}
                </div>
              </div>

              {/* Settings Panel */}
              <div className="w-full lg:w-[280px] space-y-4">
                <div>
                  <label className="text-xs font-medium" style={{ color: "#9ca3af" }}>Headline</label>
                  {editorHeadline.map((line, i) => (
                    <Input key={i} value={line} onChange={e => {
                      const copy = [...editorHeadline];
                      copy[i] = e.target.value;
                      setEditorHeadline(copy);
                    }} className="mt-1 h-8 text-sm" style={{ backgroundColor: "#0a0700", borderColor: "#2a2a1f" }} />
                  ))}
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: "#9ca3af" }}>CTA-Text</label>
                  <Input value={editorCta} onChange={e => setEditorCta(e.target.value)}
                    className="mt-1 h-8 text-sm" style={{ backgroundColor: "#0a0700", borderColor: "#2a2a1f" }} />
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: "#9ca3af" }}>Dein Name</label>
                  <Input value={editorName} onChange={e => setEditorName(e.target.value)}
                    className="mt-1 h-8 text-sm" style={{ backgroundColor: "#0a0700", borderColor: "#2a2a1f" }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Farbschema</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditorDark(true)}
                      className={`px-3 py-1 rounded text-xs ${editorDark ? "ring-1" : ""}`}
                      style={{ backgroundColor: "#0a0700", color: "#fff", borderColor: "#F5970A" }}>Dark</button>
                    <button onClick={() => setEditorDark(false)}
                      className={`px-3 py-1 rounded text-xs ${!editorDark ? "ring-1" : ""}`}
                      style={{ backgroundColor: "#fff", color: "#0a0700", borderColor: "#F5970A" }}>Light</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: "#9ca3af" }}>Ref-Link (auto)</label>
                  <p className="text-xs mt-1" style={{ color: "#F5970A" }}>{refLink}</p>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: "#9ca3af" }}>Hashtags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["#Pferdeakte", "#HufManager", "#ZukunftHuf2030", "#Pferde"].map(tag => (
                      <button key={tag} onClick={() => {
                        setEditorHashtags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
                      }}
                        className={`px-2 py-0.5 rounded text-[11px] ${editorHashtags.includes(tag) ? "" : "opacity-40"}`}
                        style={{ backgroundColor: "rgba(245,151,10,0.15)", color: "#F5970A" }}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: "#2a2a1f" }}>
                  <Button size="sm" className="w-full" onClick={downloadTemplate}
                    style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>
                    <Download className="w-3 h-3 mr-1" /> PNG Download
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" onClick={copyWithText}
                    style={{ borderColor: "#F5970A", color: "#F5970A" }}>
                    <Copy className="w-3 h-3 mr-1" /> Mit Text kopieren
                  </Button>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs"
                      onClick={() => shareWhatsApp(editorHeadline.join(" "))}>WhatsApp</Button>
                    <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs"
                      onClick={shareFacebook}>Facebook</Button>
                    <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs"
                      onClick={shareLinkedIn}>LinkedIn</Button>
                    <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs"
                      onClick={() => shareTelegram(editorHeadline.join(" "))}>Telegram</Button>
                  </div>
                  <Button size="sm" variant="ghost" className="w-full h-8 text-xs"
                    onClick={() => shareEmail("HufManager Pferdeakte", editorHeadline.join(" ") + "\n\n" + editorCta)}>
                    📧 Per E-Mail teilen
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
