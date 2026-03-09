import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  editor: any;
}

export const SettingsPanel = ({ editor }: SettingsPanelProps) => {
  const { settings, updateSetting } = editor;
  const titleLen = (settings.meta_description || "").length;

  return (
    <div className="space-y-6">
      {/* SEO */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">🔍 SEO</h3>

        <div className="space-y-2">
          <Label className="text-xs">Seiten-Titel (Browser-Tab)</Label>
          <Input
            placeholder="Hufpflege Musterhausen | HufManager"
            value={settings.hero_headline}
            onChange={(e) => updateSetting("hero_headline", e.target.value)}
          />
          <p className={cn(
            "text-[10px]",
            (settings.hero_headline || "").length > 60 ? "text-destructive" : "text-muted-foreground"
          )}>
            {(settings.hero_headline || "").length}/60 Zeichen
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Meta-Beschreibung (Google)</Label>
          <Textarea
            rows={3}
            placeholder="Professionelle Hufbearbeitung in..."
            value={settings.meta_description}
            onChange={(e) => updateSetting("meta_description", e.target.value)}
          />
          <p className={cn(
            "text-[10px]",
            titleLen > 160 ? "text-destructive" : "text-muted-foreground"
          )}>
            {titleLen}/160 Zeichen
          </p>
        </div>

        {/* Google Preview */}
        {settings.subdomain && (
          <div className="border rounded-lg p-3 bg-muted/20 space-y-0.5">
            <p className="text-[10px] text-muted-foreground">Google-Vorschau:</p>
            <p className="text-xs text-green-600 truncate">hufmanager.de/p/{settings.subdomain}</p>
            <p className="text-sm font-medium text-blue-600 truncate">
              {settings.hero_headline || settings.business_name || "Deine Seite"}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {settings.meta_description || "Keine Beschreibung hinterlegt."}
            </p>
          </div>
        )}
      </div>

      {/* Social Media */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">📱 Social Media</h3>
        <div className="space-y-2">
          <Label className="text-xs">Instagram</Label>
          <Input
            placeholder="@meinhandle"
            value={settings.social_instagram}
            onChange={(e) => updateSetting("social_instagram", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Facebook</Label>
          <Input
            placeholder="https://facebook.com/..."
            value={settings.social_facebook}
            onChange={(e) => updateSetting("social_facebook", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">TikTok</Label>
          <Input
            placeholder="@meinhandle"
            value={settings.social_tiktok}
            onChange={(e) => updateSetting("social_tiktok", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Eigene Website</Label>
          <Input
            placeholder="https://..."
            value={settings.social_website}
            onChange={(e) => updateSetting("social_website", e.target.value)}
          />
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">📞 Kontakt-Info</h3>
        <div className="space-y-2">
          <Label className="text-xs">Telefon</Label>
          <Input
            placeholder="+49 170 1234567"
            value={settings.phone}
            onChange={(e) => updateSetting("phone", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Adresse</Label>
          <Input
            placeholder="Musterstr. 1, 12345 Stadt"
            value={settings.address}
            onChange={(e) => updateSetting("address", e.target.value)}
          />
        </div>
      </div>

      {/* Rechtliches */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">⚖️ Rechtliches</h3>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Noch kein Impressum?{" "}
            <a
              href="https://partner.e-recht24.de/go.cgi?pid=1130&wmid=18&cpid=1&prid=1&subid=hufmanager&target=eRecht24_Impressumgenerator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F5970A] hover:underline font-medium"
            >
              Bei eRecht24 erstellen →
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            Keine Datenschutzerklärung?{" "}
            <a
              href="https://partner.e-recht24.de/go.cgi?pid=1130&wmid=17&cpid=1&prid=1&subid=hufmanager&target=Datenschutzgenerator_Startseite"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F5970A] hover:underline font-medium"
            >
              Bei eRecht24 erstellen →
            </a>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">* Affiliate-Link</p>
        </div>
      </div>

      {/* Domain */}
      {settings.subdomain && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">🌐 Domain</h3>
          <div className="border rounded-lg p-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">Deine Adresse:</p>
            <p className="text-sm font-mono text-foreground">
              hufmanager.de/p/<strong>{settings.subdomain}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
