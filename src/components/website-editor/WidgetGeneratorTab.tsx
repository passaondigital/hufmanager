import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Copy, MessageSquare, Calendar, Star, ShoppingBag, MessageCircle, Image, Globe, Info, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetGeneratorTabProps {
  subdomain: string;
  businessName: string;
  primaryColor: string;
  isPro?: boolean;
  isTeam?: boolean;
}

const WIDGET_TYPES = [
  { id: "contact", label: "Kontaktformular", icon: MessageSquare, description: "Anfragen direkt erhalten" },
  { id: "booking", label: "Buchung anfragen", icon: Calendar, description: "Services anzeigen & buchen" },
  { id: "reviews", label: "Bewertungen", icon: Star, description: "Social Proof einbinden" },
  { id: "services", label: "Leistungen", icon: ShoppingBag, description: "Preisliste anzeigen" },
  { id: "chat", label: "Chat-Bot", icon: MessageCircle, description: "Interaktiver Lead-Bot" },
  { id: "gallery", label: "Galerie", icon: Image, description: "Bilder anzeigen" },
] as const;

const RADIUS_OPTIONS = [
  { id: "sharp", label: "Eckig" },
  { id: "soft", label: "Soft" },
  { id: "round", label: "Rund" },
];

const MODE_OPTIONS = [
  { id: "light", label: "Hell" },
  { id: "dark", label: "Dunkel" },
  { id: "auto", label: "Auto" },
];

export function WidgetGeneratorTab({ subdomain, businessName, primaryColor, isPro = false, isTeam = false }: WidgetGeneratorTabProps) {
  const [selectedWidget, setSelectedWidget] = useState<string>("contact");
  const [customColor, setCustomColor] = useState(primaryColor.replace("#", ""));
  const [radius, setRadius] = useState("soft");
  const [mode, setMode] = useState("light");
  const [hideBranding, setHideBranding] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const canCustomize = isPro || isTeam;
  const canWhiteLabel = isTeam;

  const baseUrl = "https://hufmanager.de";

  const widgetUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (canCustomize && customColor && customColor !== primaryColor.replace("#", "")) {
      params.set("color", customColor);
    }
    if (canCustomize && radius !== "soft") params.set("radius", radius);
    if (canCustomize && mode !== "light") params.set("mode", mode);
    if (canWhiteLabel && hideBranding) params.set("hide_branding", "true");

    const paramStr = params.toString();
    return `${baseUrl}/widget/${encodeURIComponent(subdomain)}/${selectedWidget}${paramStr ? `?${paramStr}` : ""}`;
  }, [selectedWidget, subdomain, customColor, radius, mode, hideBranding, canCustomize, canWhiteLabel, primaryColor]);

  const iframeCode = useMemo(() => {
    const safeBusinessName = businessName.replace(/"/g, "&quot;").replace(/</g, "&lt;");
    const widgetLabel = WIDGET_TYPES.find(w => w.id === selectedWidget)?.label || "Widget";
    return `<iframe
  src="${widgetUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border-radius: 12px; border: 1px solid #e5e7eb;"
  id="huf-widget-${selectedWidget}"
  loading="lazy"
  title="${safeBusinessName} – ${widgetLabel}">
</iframe>
<script>
  window.addEventListener("message", function(e) {
    if (e.data && e.data.type === "huf-widget-resize") {
      var el = document.getElementById("huf-widget-${selectedWidget}");
      if (el) el.height = e.data.height + "px";
    }
  });
</script>`;
  }, [widgetUrl, selectedWidget, businessName]);

  const jsCode = `<!-- JavaScript-Widgets kommen in Kürze für Pro-Kunden -->
<div id="huf-${selectedWidget}-${subdomain}"></div>
<script src="${baseUrl}/embed.js?slug=${encodeURIComponent(subdomain)}&widget=${selectedWidget}&color=${customColor}"></script>`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Code kopiert! 📋" });
  };

  const privacyText = `Auf unserer Website setzen wir Widgets von HufManager (hufmanager.de) ein. Dabei werden Daten an HufManager übermittelt. Details entnehmen Sie unserer Datenschutzerklärung. Es besteht ein Auftragsverarbeitungsvertrag (AVV) mit der HufManager GmbH.`;

  return (
    <div className="space-y-4">
      {/* Step 1: Widget Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Widget wählen</CardTitle>
          <CardDescription>Wähle welches Element du einbetten möchtest</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {WIDGET_TYPES.map((widget) => {
              const Icon = widget.icon;
              const isSelected = selectedWidget === widget.id;
              return (
                <button
                  key={widget.id}
                  onClick={() => setSelectedWidget(widget.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("h-6 w-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium text-foreground">{widget.label}</span>
                  <span className="text-xs text-muted-foreground">{widget.description}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Design Customization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">2. Design anpassen</CardTitle>
              <CardDescription>Passe das Widget an dein Website-Design an</CardDescription>
            </div>
            {!canCustomize && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Ab Pro
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className={cn("space-y-4", !canCustomize && "opacity-50 pointer-events-none")}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Akzentfarbe</label>
            <div className="flex gap-2 items-center">
              <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: `#${customColor}` }} />
              <Input
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6))}
                placeholder="F5970A"
                className="font-mono max-w-[140px]"
                maxLength={6}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ecken</label>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  variant={radius === opt.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRadius(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Farbmodus</label>
            <div className="flex gap-2">
              {MODE_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  variant={mode === opt.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">HufManager-Branding ausblenden</p>
              <p className="text-xs text-muted-foreground">
                {canWhiteLabel ? "White-Label Modus" : "Nur im Team-Plan verfügbar"}
              </p>
            </div>
            <Switch
              checked={hideBranding}
              onCheckedChange={setHideBranding}
              disabled={!canWhiteLabel}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Vorschau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 flex justify-center">
            <iframe
              src={widgetUrl}
              className="border rounded-lg bg-white shadow-sm"
              style={{ width: "100%", maxWidth: "400px", height: "400px" }}
              title="Widget-Vorschau"
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Code kopieren</CardTitle>
          <CardDescription>Füge diesen Code auf deiner Website ein</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="iframe">
            <TabsList>
              <TabsTrigger value="iframe">iFrame</TabsTrigger>
              <TabsTrigger value="js" disabled>
                JavaScript <Badge variant="secondary" className="ml-1 text-[10px]">Bald</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="iframe" className="mt-3">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap text-foreground">
                  {iframeCode}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 gap-1"
                  onClick={() => copyToClipboard(iframeCode)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Kopieren
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="js" className="mt-3">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap text-foreground">
                  {jsCode}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Step 5: Help */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center justify-between w-full text-left"
          >
            <CardTitle className="text-base">📖 Wie einbetten?</CardTitle>
            {showHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CardHeader>
        {showHelp && (
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="space-y-2">
              <p className="font-medium text-foreground">WordPress</p>
              <p>Seite bearbeiten → Block hinzufügen → "Individuelles HTML" → Code einfügen</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Jimdo</p>
              <p>Element hinzufügen → HTML/Widget → Code einfügen</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Wix</p>
              <p>Add → Embed → HTML iframe → Code einfügen</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Squarespace</p>
              <p>Code Block hinzufügen → HTML → Code einfügen</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Typo3</p>
              <p>Content Element → HTML → Code einfügen</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Step 6: DSGVO */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">DSGVO-Hinweis</p>
              <p className="text-xs text-muted-foreground">
                Wenn du das Widget auf deiner Website einbindest, erwähne HufManager in deiner
                Datenschutzerklärung als Auftragsverarbeiter. Dein AVV mit uns deckt das bereits ab.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                onClick={() => copyToClipboard(privacyText)}
              >
                <Copy className="h-3 w-3" />
                Muster-Datenschutztext kopieren
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
