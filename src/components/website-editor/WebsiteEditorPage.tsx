import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Globe, ExternalLink, Loader2, GripVertical, Sparkles, Search, Settings, FileText, BarChart3, MessageSquare } from "lucide-react";
import { WEBSITE_PAGE_TYPES } from "@/data/websitePageTypes";
import { WebsiteSEOSettings } from "./WebsiteSEOSettings";
import { WebsiteLeadSettings } from "./WebsiteLeadSettings";
import { WebsiteBlogManager } from "./WebsiteBlogManager";
import { WebsiteOnboarding } from "./WebsiteOnboarding";

export const WebsiteEditorPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["business-settings-website", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("business_settings")
        .select("id, user_id, business_name, owner_name, subdomain, primary_color, phone, website_active_pages, whatsapp_enabled, whatsapp_number, exit_intent_enabled, google_search_console_code, google_analytics_id, facebook_pixel_id, meta_description, impressum_text, hero_headline, logo_url, address, about_text, social_instagram, social_facebook, social_tiktok, social_website")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const activePages: string[] = (settings?.website_active_pages as string[]) || ["home", "contact", "impressum", "datenschutz"];

  const togglePageMutation = useMutation({
    mutationFn: async ({ pageId, enabled }: { pageId: string; enabled: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const newPages = enabled
        ? [...activePages, pageId]
        : activePages.filter((p) => p !== pageId);
      
      const { error } = await supabase
        .from("business_settings")
        .update({ website_active_pages: newPages })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings-website"] });
      toast({ title: "Gespeichert" });
    },
  });

  const subdomain = settings?.subdomain;
  const websiteUrl = subdomain ? `${window.location.origin}/p/${subdomain}` : null;

  // Check if first time (no subdomain = show onboarding)
  if (!isLoading && !subdomain && !showOnboarding) {
    return <WebsiteOnboarding onComplete={() => setShowOnboarding(false)} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Meine Website
          </h1>
          <p className="text-muted-foreground mt-1">
            Deine professionelle Website — besser als Wix, in 15 Minuten fertig.
          </p>
        </div>
        {websiteUrl && (
          <Button variant="outline" asChild>
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Website ansehen
            </a>
          </Button>
        )}
      </div>

      {/* Live URL */}
      {websiteUrl && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-3">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              Live
            </Badge>
            <code className="text-sm font-mono text-foreground">{websiteUrl}</code>
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(websiteUrl); toast({ title: "Link kopiert!" }); }}>
              Kopieren
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pages" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pages" className="gap-1.5"><FileText className="h-4 w-4" />Seiten</TabsTrigger>
          <TabsTrigger value="blog" className="gap-1.5"><Sparkles className="h-4 w-4" />Blog</TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5"><MessageSquare className="h-4 w-4" />Leads</TabsTrigger>
          <TabsTrigger value="seo" className="gap-1.5"><Search className="h-4 w-4" />SEO</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-4 w-4" />Extras</TabsTrigger>
        </TabsList>

        {/* PAGES TAB */}
        <TabsContent value="pages" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Seiten verwalten</CardTitle>
              <CardDescription>Aktiviere und ordne die Seiten deiner Website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {WEBSITE_PAGE_TYPES.map((page) => {
                const isActive = activePages.includes(page.id);
                return (
                  <div key={page.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-lg">{page.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{page.label}</p>
                      <p className="text-xs text-muted-foreground">{page.description}</p>
                      {isActive && page.slug && (
                        <code className="text-xs text-primary">/p/{subdomain}/{page.slug}</code>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {page.required && (
                        <Badge variant="secondary" className="text-xs">Pflicht</Badge>
                      )}
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => togglePageMutation.mutate({ pageId: page.id, enabled: checked })}
                        disabled={page.required || togglePageMutation.isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BLOG TAB */}
        <TabsContent value="blog" className="mt-6">
          <WebsiteBlogManager />
        </TabsContent>

        {/* LEADS TAB */}
        <TabsContent value="leads" className="mt-6">
          <WebsiteLeadSettings settings={settings} />
        </TabsContent>

        {/* SEO TAB */}
        <TabsContent value="seo" className="mt-6">
          <WebsiteSEOSettings settings={settings} />
        </TabsContent>

        {/* EXTRAS TAB */}
        <TabsContent value="settings" className="mt-6 space-y-4">
          <WebsiteExtrasSettings settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Extras settings (WhatsApp, Exit-Intent, Analytics)
function WebsiteExtrasSettings({ settings }: { settings: any }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings?.whatsapp_enabled || false);
  const [whatsappNumber, setWhatsappNumber] = useState(settings?.whatsapp_number || "");
  const [exitIntent, setExitIntent] = useState(settings?.exit_intent_enabled || false);
  const [gaId, setGaId] = useState(settings?.google_analytics_id || "");
  const [fbPixel, setFbPixel] = useState(settings?.facebook_pixel_id || "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("business_settings")
        .update({
          whatsapp_enabled: whatsappEnabled,
          whatsapp_number: whatsappNumber,
          exit_intent_enabled: exitIntent,
          google_analytics_id: gaId || null,
          facebook_pixel_id: fbPixel || null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings-website"] });
      toast({ title: "Gespeichert" });
    },
  });

  return (
    <div className="space-y-4">
      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💬 WhatsApp-Button</CardTitle>
          <CardDescription>Floating WhatsApp-Button auf deiner Website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">WhatsApp-Button anzeigen</span>
            <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
          </div>
          {whatsappEnabled && (
            <Input placeholder="+49 170 1234567" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
          )}
        </CardContent>
      </Card>

      {/* Exit Intent */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🚪 Exit-Intent Popup</CardTitle>
          <CardDescription>Zeigt ein Popup wenn Besucher die Seite verlassen wollen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">Exit-Intent aktivieren</span>
            <Switch checked={exitIntent} onCheckedChange={setExitIntent} />
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 Analytics & Tracking</CardTitle>
          <CardDescription>Optional: Google Analytics & Facebook Pixel (nur mit Cookie-Einwilligung)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium">Google Analytics 4 ID</label>
            <Input placeholder="G-XXXXXXXXXX" value={gaId} onChange={(e) => setGaId(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Facebook Pixel ID</label>
            <Input placeholder="123456789" value={fbPixel} onChange={(e) => setFbPixel(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Extras speichern
      </Button>
    </div>
  );
}
