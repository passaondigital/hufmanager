import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Briefcase, Mic, Shield, Smartphone, Share } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { HufiPermissionsSettings } from "@/components/consent/HufiPermissionsSettings";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuth } from "@/hooks/useAuth";

const TAB_REDIRECTS: Record<string, string> = {
  profil: "/management/profil",
  website: "/management/website",
  kommunikation: "/management/kommunikation",
  abo: "/management/abo",
  rechtliches: "/management/rechtliches",
  steuer: "/management/steuer",
};

export default function ManagementHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const { user } = useAuth();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TAB_REDIRECTS[tab]) {
      navigate(TAB_REDIRECTS[tab], { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader icon="⚙️" title="Management" subtitle="Einstellungen & Verwaltung" />

      {/* PWA Install Section */}
      <div style={{
        margin: "0 4px",
        background: isInstalled ? "#F0FDF4" : "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
        border: `1px solid ${isInstalled ? "#BBF7D0" : "rgba(249,115,22,0.2)"}`,
        borderRadius: 20,
        padding: "16px 18px",
      }}>
        {isInstalled ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Smartphone size={18} style={{ color: "#10B981" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#10B981" }}>App installiert</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Hufi läuft als Homescreen-App</div>
            </div>
          </div>
        ) : isIOS ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(249,115,22,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Smartphone size={18} style={{ color: "#F97316" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>App installieren</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Hufi zum Homescreen hinzufügen</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { icon: <Share size={14} />, text: 'Tippe auf "Teilen" in der Safari-Menüleiste' },
                { icon: "➕", text: '"Zum Home-Bildschirm" wählen' },
                { icon: "✓", text: '"Hinzufügen" tippen — fertig!' },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.7)", borderRadius: 12, border: "1px solid rgba(249,115,22,0.1)" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: "#F97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700 }}>
                    {typeof step.icon === "string" ? step.icon : step.icon}
                  </div>
                  <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{step.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : canInstall ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(249,115,22,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Smartphone size={18} style={{ color: "#F97316" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>App installieren</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Schnellzugriff vom Homescreen</div>
            </div>
            <button
              onClick={promptInstall}
              style={{
                height: 36, borderRadius: 12, background: "#F97316", border: "none",
                color: "#FFFFFF", fontSize: 13, fontWeight: 700, padding: "0 16px",
                cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
              }}
            >
              Installieren
            </button>
          </div>
        ) : null}
      </div>

      <TileCategory title="Mein Account">
        <Tile
          icon={<User className="w-10 h-10 text-primary" />}
          title="Mein Profil"
          description="Profil, Zertifikate, Fotos, Kontaktdaten, Qualifikationen"
          onClick={() => navigate("/management/profil")}
        />
        <Tile
          icon={<Shield className="w-10 h-10 text-primary" />}
          title="Sicherheit"
          description="Biometrische Anmeldung — Fingerabdruck, Face ID, Iris-Scan"
          onClick={() => navigate("/management/sicherheit")}
        />
      </TileCategory>

      <TileCategory title="Business-Einstellungen">
        <Tile
          icon={<Briefcase className="w-10 h-10 text-primary" />}
          title="Meine Business-Einstellungen"
          description="Steuer, MwSt, Website, Abo, Rechnungen, Kommunikation, AGB, Datenschutz, Impressum, Preisanzeige"
          onClick={() => navigate("/management/business")}
          colSpan
        />
      </TileCategory>

      <TileCategory title="Hufi">
        <Tile
          icon={<Mic className="w-10 h-10 text-primary" />}
          title="Botschafter werden"
          description="Provision verdienen, Empfehlungslinks, Statistiken, Auszahlungen, Werbemittel"
          onClick={() => navigate("/management/botschafter")}
        />
      </TileCategory>

      {/* Berechtigungen & Hufi — inline Einstellungsbereich */}
      <div className="px-1">
        <HufiPermissionsSettings userId={user?.id ?? ""} />
      </div>
    </div>
  );
}
