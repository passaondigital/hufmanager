import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Loader2, Check, Sparkles, Download, Star, Save } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { BotschafterHelpTooltip } from "@/components/botschafter/BotschafterHelpTooltip";
import { BotschafterFloatingHelp } from "@/components/botschafter/BotschafterFloatingHelp";
import html2canvas from "html2canvas";

type Format = { id: string; icon: string; label: string; w: number; h: number };
const FORMATS: Format[] = [
  { id: "story", icon: "📱", label: "Story", w: 1080, h: 1920 },
  { id: "post", icon: "🖼️", label: "Post", w: 1080, h: 1080 },
  { id: "facebook", icon: "📣", label: "Facebook", w: 1200, h: 628 },
  { id: "flyer", icon: "📋", label: "Flyer A4", w: 794, h: 1123 },
  { id: "banner", icon: "🎯", label: "Web-Banner", w: 728, h: 90 },
  { id: "email", icon: "📧", label: "E-Mail-Header", w: 600, h: 200 },
];

type Template = { id: string; label: string; bg: string; textColor: string; ctaBg: string; ctaColor: string };
const TEMPLATES: Template[] = [
  { id: "a", label: "Pferdebesitzer", bg: "#f97316", textColor: "#ffffff", ctaBg: "#ffffff", ctaColor: "#f97316" },
  { id: "b", label: "Profi-Empfehlung", bg: "#0a0a0a", textColor: "#ffffff", ctaBg: "#f97316", ctaColor: "#ffffff" },
  { id: "c", label: "Launch-Countdown", bg: "#ffffff", textColor: "#0a0a0a", ctaBg: "#f97316", ctaColor: "#ffffff" },
  { id: "d", label: "Blank", bg: "#ffffff", textColor: "#0a0a0a", ctaBg: "#f97316", ctaColor: "#ffffff" },
];

const BG_PRESETS = ["#f97316", "#0a0a0a", "#ffffff", "#f9fafb"];
const AUDIENCES = ["🐴 Pferdebesitzer", "🔨 Hufbearbeiter", "🩺 Tierarzt", "🏇 Reiter", "🏢 Stallbesitzer"];
const TONES = ["Emotional & herzlich", "Professionell", "Direkt & klar", "Begeisternd"];

type Variant = { headline: string; subtext: string; cta: string };

export default function WerbemittelEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [botschafter, setBotschafter] = useState<{ id: string; referral_code: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Steps
  const [format, setFormat] = useState<Format>(FORMATS[1]);
  const [template, setTemplate] = useState<Template>(TEMPLATES[0]);
  const [bgColor, setBgColor] = useState("#f97316");
  const [showLogo, setShowLogo] = useState(true);
  const [showLink, setShowLink] = useState(true);

  // Canvas text
  const [headline, setHeadline] = useState("Dein Pferd. Deine Daten.");
  const [subtext, setSubtext] = useState("Die digitale Pferdeakte — immer dabei, sicher geteilt.");
  const [ctaText, setCtaText] = useState("Jetzt entdecken");

  // AI
  const [prompt, setPrompt] = useState("");
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(["🐴 Pferdebesitzer"]);
  const [tone, setTone] = useState("Emotional & herzlich");
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);

  // Save
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) loadBotschafter();
  }, [user?.id]);

  const loadBotschafter = async () => {
    const { data } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, referral_code")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .maybeSingle();
    setBotschafter(data);
    setLoading(false);

    // Load existing asset if editing
    const assetId = searchParams.get("asset");
    if (assetId && data) {
      const { data: asset } = await supabase
        .from("botschafter_assets")
        .select("id, canvas_data, prompt_used, asset_type")
        .eq("id", assetId)
        .eq("botschafter_id", data.id)
        .maybeSingle();
      if (asset?.canvas_data) {
        const cd = asset.canvas_data as Record<string, string>;
        setFormat(FORMATS.find(f => f.id === cd.format) || FORMATS[1]);
        setTemplate(TEMPLATES.find(t => t.id === cd.template) || TEMPLATES[0]);
        setBgColor(cd.backgroundColor || "#f97316");
        setHeadline(cd.headline || "");
        setSubtext(cd.subtext || "");
        setCtaText(cd.cta || "");
        setShowLogo(cd.showLogo !== "false");
        setShowLink(cd.showLink !== "false");
        setSavedId(asset.id);
      }
      if (asset?.prompt_used) setPrompt(asset.prompt_used);
    }
  };

  const selectFormat = (f: Format) => {
    setFormat(f);
    if (!completedSteps.includes("format")) setCompletedSteps(p => [...p, "format"]);
  };

  const selectTemplate = (t: Template) => {
    setTemplate(t);
    setBgColor(t.bg);
    if (!completedSteps.includes("template")) setCompletedSteps(p => [...p, "template"]);
  };

  const toggleAudience = (a: string) => {
    setSelectedAudiences(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const generateTexts = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-werbemittel", {
        body: { prompt, audiences: selectedAudiences.join(", "), tone },
      });
      if (error) throw error;
      if (data?.variants) {
        setVariants(data.variants);
        if (!completedSteps.includes("ai")) setCompletedSteps(p => [...p, "ai"]);
      }
    } catch (e: any) {
      toast.error(e.message || "KI-Generierung fehlgeschlagen");
      // Show fallbacks
      setVariants([
        { headline: "Dein Pferd verdient mehr", subtext: "Die digitale Pferdeakte — alle Daten sicher, immer dabei.", cta: "Jetzt entdecken" },
        { headline: "Sicherheit für dein Pferd", subtext: "Impfpass, Befunde, Behandlungen — alles an einem Ort.", cta: "Kostenlos starten" },
        { headline: "Schütze was du liebst", subtext: "Überblick über die Gesundheit deines Pferdes.", cta: "Mehr erfahren" },
      ]);
    }
    setGenerating(false);
  };

  const applyVariant = (v: Variant) => {
    setHeadline(v.headline);
    setSubtext(v.subtext);
    setCtaText(v.cta);
    toast.success("Text übernommen");
  };

  const handleSave = async () => {
    if (!botschafter) return;
    setSaving(true);
    const canvasData = {
      format: format.id, template: template.id, headline, subtext, cta: ctaText,
      backgroundColor: bgColor, showLogo: String(showLogo), showLink: String(showLink),
    };
    const payload = {
      botschafter_id: botschafter.id,
      asset_type: format.id,
      title: `Werbemittel ${new Date().toLocaleDateString("de")}`,
      prompt_used: prompt || null,
      canvas_data: canvasData,
    };

    let result;
    if (savedId) {
      result = await supabase.from("botschafter_assets").update(payload).eq("id", savedId).select("id").single();
    } else {
      result = await supabase.from("botschafter_assets").insert(payload).select("id").single();
    }

    setSaving(false);
    if (result.error) { toast.error("Fehler beim Speichern"); return; }
    setSavedId(result.data.id);
    toast.success("Gespeichert!");
  };

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    try {
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true });
      const link = document.createElement("a");
      link.download = `HufManager_${format.id}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("PNG heruntergeladen");
    } catch { toast.error("Download fehlgeschlagen"); }
  };

  const handleFavorite = async () => {
    if (!savedId) { toast.error("Bitte zuerst speichern"); return; }
    await supabase.from("botschafter_assets").update({ is_favorite: true }).eq("id", savedId);
    toast.success("Als Favorit markiert ⭐");
  };

  const isDark = (c: string) => {
    const hex = c.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  };

  const textColor = isDark(bgColor) ? "#ffffff" : "#0a0a0a";
  const referralUrl = botschafter ? `hufmanager.de/pferdeakte?ref=${botschafter.referral_code}` : "";

  // Aspect ratio for canvas preview
  const maxW = 500;
  const aspect = format.w / format.h;
  const canvasW = Math.min(maxW, aspect > 1 ? maxW : maxW * aspect);
  const canvasH = canvasW / aspect;

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!botschafter) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Du musst ein aktiver Botschafter sein um Werbemittel zu erstellen.</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>Zurück</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Zurück zu Werbemittel
        </Button>
        <h1 className="text-lg font-bold">Werbemittel erstellen</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-0">
        {/* Left Panel */}
        <div className="w-full lg:w-[380px] lg:min-w-[380px] border-r bg-card overflow-y-auto lg:h-[calc(100vh-57px)]">
          <Accordion type="single" collapsible defaultValue="format" className="px-4 py-2">
            {/* Step 1: Format */}
            <AccordionItem value="format">
              <AccordionTrigger className="text-sm font-medium">
                {completedSteps.includes("format") && <Check className="w-4 h-4 text-green-500 mr-2" />}
                1. Format wählen
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  {FORMATS.map(f => (
                    <button key={f.id} onClick={() => selectFormat(f)}
                      className={`p-3 rounded-lg border-2 text-center text-xs transition-all ${format.id === f.id ? "border-orange-500 bg-orange-500/10" : "border-border hover:border-muted-foreground/30"}`}
                    >
                      <div className="text-lg">{f.icon}</div>
                      <div className="font-medium mt-1">{f.label}</div>
                      <div className="text-muted-foreground">{f.w}×{f.h}</div>
                    </button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 2: Template */}
            <AccordionItem value="template">
              <AccordionTrigger className="text-sm font-medium">
                {completedSteps.includes("template") && <Check className="w-4 h-4 text-green-500 mr-2" />}
                2. Vorlage wählen
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => selectTemplate(t)}
                      className={`rounded-lg border-2 overflow-hidden transition-all ${template.id === t.id ? "border-orange-500" : "border-border"}`}
                    >
                      <div className="h-16 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: t.bg, color: t.textColor }}>
                        {t.label}
                      </div>
                    </button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 3: AI Text */}
            <AccordionItem value="ai">
              <AccordionTrigger className="text-sm font-medium">
                {completedSteps.includes("ai") && <Check className="w-4 h-4 text-green-500 mr-2" />}
                3. KI-Texte generieren
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <Textarea placeholder="z.B. Ich möchte Pferdebesitzerinnen auf die kostenlose App hinweisen..." value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} />
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Zielgruppe</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {AUDIENCES.map(a => (
                      <button key={a} onClick={() => toggleAudience(a)}
                        className={`px-2 py-1 rounded-full text-xs transition-all ${selectedAudiences.includes(a) ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"}`}
                      >{a}</button>
                    ))}
                  </div>
                </div>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={generateTexts} disabled={generating}>
                  {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {generating ? "KI denkt nach..." : "3 Textvarianten generieren"}
                </Button>

                {variants.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {variants.map((v, i) => (
                      <Card key={i} className="cursor-pointer hover:border-orange-500/50 transition-colors" onClick={() => applyVariant(v)}>
                        <CardContent className="p-3">
                          <p className="font-bold text-sm">{v.headline}</p>
                          <p className="text-xs text-muted-foreground mt-1">{v.subtext}</p>
                          <Badge variant="outline" className="mt-2 text-xs">{v.cta}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Step 4: Design */}
            <AccordionItem value="design">
              <AccordionTrigger className="text-sm font-medium">4. Design anpassen</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Hintergrundfarbe</label>
                  <div className="flex gap-2 mt-1 items-center">
                    {BG_PRESETS.map(c => (
                      <button key={c} onClick={() => setBgColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${bgColor === c ? "border-orange-500 scale-110" : "border-border"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <Input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-10 h-8 p-0 border-0 cursor-pointer" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Headline</label>
                    <Input value={headline} onChange={e => setHeadline(e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Subtext</label>
                    <Input value={subtext} onChange={e => setSubtext(e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">CTA-Text</label>
                    <Input value={ctaText} onChange={e => setCtaText(e.target.value)} className="h-9" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Referral-Link einblenden</span>
                  <Switch checked={showLink} onCheckedChange={setShowLink} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Logo einblenden</span>
                  <Switch checked={showLogo} onCheckedChange={setShowLogo} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Right: Canvas Preview */}
        <div className="flex-1 bg-muted/50 flex flex-col items-center justify-center p-6 lg:h-[calc(100vh-57px)] overflow-auto">
          <p className="text-xs text-muted-foreground mb-3">{format.label} — {format.w}×{format.h}px</p>
          <div
            ref={canvasRef}
            className="relative overflow-hidden shadow-2xl"
            style={{
              width: canvasW,
              height: canvasH,
              backgroundColor: bgColor,
              borderRadius: 12,
            }}
          >
            {/* Logo */}
            {showLogo && (
              <div className="absolute top-4 left-4 font-bold text-sm" style={{ color: textColor }}>
                HufManager
              </div>
            )}

            {/* Main content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center gap-3">
              <h2 className="font-extrabold leading-tight" style={{ color: textColor, fontSize: Math.max(14, canvasW * 0.06) }}>
                {headline}
              </h2>
              <p style={{ color: textColor, opacity: 0.8, fontSize: Math.max(10, canvasW * 0.032) }}>
                {subtext}
              </p>
              <div className="mt-2 px-5 py-2 rounded-full font-bold" style={{ backgroundColor: "#f97316", color: "#ffffff", fontSize: Math.max(10, canvasW * 0.03) }}>
                {ctaText}
              </div>
            </div>

            {/* Referral Link */}
            {showLink && referralUrl && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <div className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: "rgba(255,255,255,0.2)", color: textColor, backdropFilter: "blur(4px)" }}>
                  {referralUrl}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-6 flex-wrap justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" />Zurück</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Speichern
            </Button>
            <Button onClick={handleDownload} className="bg-orange-500 hover:bg-orange-600 text-white">
              <Download className="w-4 h-4 mr-1" /> PNG laden
            </Button>
            <Button variant="outline" onClick={handleFavorite} disabled={!savedId}>
              <Star className="w-4 h-4 mr-1" /> Favorit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
