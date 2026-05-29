import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, Info, ExternalLink } from "lucide-react";

interface Props {
  settings: any;
}

export const WebsiteSEOSettings = ({ settings }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [metaDesc, setMetaDesc] = useState(settings?.meta_description || "");
  const [gscCode, setGscCode] = useState(settings?.google_search_console_code || "");

  const businessName = settings?.business_name || settings?.owner_name || "Hufpfleger";
  const city = settings?.address?.split(",").pop()?.trim() || "";

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("business_settings")
        .update({
          meta_description: metaDesc,
          google_search_console_code: gscCode || null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings-website"] });
      toast({ title: "SEO-Einstellungen gespeichert" });
    },
  });

  return (
    <div className="space-y-4">
      {/* Auto SEO Titles Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Automatische SEO-Titel
          </CardTitle>
          <CardDescription>So erscheinst du in Google-Ergebnissen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm text-primary font-medium truncate">
                {businessName} — Hufpfleger{city ? ` in ${city}` : ""} | Professionelle Hufbearbeitung
              </p>
              <p className="text-xs text-green-600 truncate">
                hufiapp.de/p/{settings?.subdomain || "dein-name"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {metaDesc || `Professionelle Hufpflege von ${businessName}. Termine online buchen, Bewertungen lesen, Leistungen ansehen.`}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Meta-Beschreibung</label>
            <Textarea
              value={metaDesc}
              onChange={(e) => setMetaDesc(e.target.value)}
              placeholder={`Professionelle Hufpflege von ${businessName}...`}
              maxLength={160}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">{metaDesc.length}/160 Zeichen</p>
          </div>
        </CardContent>
      </Card>

      {/* LocalBusiness Schema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📋 Strukturierte Daten</CardTitle>
          <CardDescription>Wird automatisch aus deinen Geschäftsdaten generiert</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-3">
            <pre className="text-xs text-muted-foreground overflow-x-auto">
{JSON.stringify({
  "@type": "LocalBusiness",
  name: businessName,
  address: settings?.address || "(Adresse hinterlegen)",
  telephone: settings?.phone || "(Telefon hinterlegen)",
  url: `hufiapp.de/p/${settings?.subdomain || "..."}`,
}, null, 2)}
            </pre>
          </div>
          {(!settings?.address || !settings?.phone) && (
            <Alert className="mt-3">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Hinterlege Adresse und Telefon in den Einstellungen für bessere SEO-Ergebnisse.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Google Search Console */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🔍 Google Search Console</CardTitle>
          <CardDescription>Verifiziere deine Website bei Google</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium">Verification Code</label>
            <Input
              value={gscCode}
              onChange={(e) => setGscCode(e.target.value)}
              placeholder="google-site-verification=..."
            />
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              1. Gehe zu <a href="https://search.google.com/search-console" target="_blank" className="text-primary underline">Google Search Console</a><br />
              2. Wähle "URL-Präfix" und gib deine Website-URL ein<br />
              3. Wähle "HTML-Tag" als Verifizierungsmethode<br />
              4. Kopiere den Meta-Tag-Inhalt hier ein
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Google My Business Hint */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="font-medium text-sm text-foreground mb-1">💡 Tipp: Google My Business</p>
          <p className="text-xs text-muted-foreground">
            Trage deine Website-URL in dein Google My Business Profil ein — 
            das verbessert dein lokales Ranking erheblich.
          </p>
          <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-2">
            Google My Business öffnen <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        SEO-Einstellungen speichern
      </Button>
    </div>
  );
};
