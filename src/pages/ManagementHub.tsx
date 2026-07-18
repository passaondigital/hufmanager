import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Briefcase, Mic, Shield, Smartphone, Share, Globe, MessageSquare, Scale, Calculator, Upload, LogOut, XCircle, Trash2, Loader2 } from "lucide-react";
import { useLogout } from "@/hooks/useLogout";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { HufiPermissionsSettings } from "@/components/consent/HufiPermissionsSettings";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

const COPECART_FALLBACK_LOGIN = "https://copecart.com/login";

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
  const logout = useLogout();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TAB_REDIRECTS[tab]) {
      navigate(TAB_REDIRECTS[tab], { replace: true });
    }
  }, [searchParams, navigate]);

  function handleCancelConfirm() {
    setCancelDialogOpen(false);
    window.open(COPECART_FALLBACK_LOGIN, "_blank", "noopener,noreferrer");
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "LÖSCHEN" || !user?.id) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-my-account");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Dein Account wurde vollständig gelöscht.");
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (err) {
      console.error("[ManagementHub] Account-Löschung fehlgeschlagen:", err);
      toast.error("Löschung fehlgeschlagen. Bitte versuch es erneut oder kontaktiere den Support.");
      setDeleting(false);
    }
  }

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
          description="Passwort ändern, E-Mail-Adresse, Zwei-Faktor-Authentifizierung"
          onClick={() => navigate("/management/sicherheit")}
        />
      </TileCategory>

      <TileCategory title="Business">
        <Tile
          icon={<Briefcase className="w-10 h-10 text-primary" />}
          title="Business-Einstellungen"
          description="Steuer, MwSt, Rechnungen, Preisanzeige, Bankdaten"
          onClick={() => navigate("/management/business")}
        />
        <Tile
          icon={<Globe className="w-10 h-10 text-primary" />}
          title="Meine Website"
          description="Landingpage, Logo, Farben, Angebot, Impressum"
          onClick={() => navigate("/management/website")}
        />
        <Tile
          icon={<MessageSquare className="w-10 h-10 text-primary" />}
          title="Kommunikation"
          description="E-Mail, WhatsApp, Benachrichtigungen, Erinnerungen"
          onClick={() => navigate("/management/kommunikation")}
        />
      </TileCategory>

      <TileCategory title="Recht & Steuer">
        <Tile
          icon={<Scale className="w-10 h-10 text-primary" />}
          title="Rechtliches"
          description="AGB, Datenschutz, Widerruf, Impressum"
          onClick={() => navigate("/management/rechtliches")}
        />
        <Tile
          icon={<Calculator className="w-10 h-10 text-primary" />}
          title="Steuer"
          description="Steuernummer, MwSt, Kleinunternehmer, DATEV"
          onClick={() => navigate("/management/steuer")}
        />
        <Tile
          icon={<Upload className="w-10 h-10 text-primary" />}
          title="Abo & Lizenz"
          description="Aktueller Plan, Upgrade, Rechnungen, Kündigung"
          onClick={() => navigate("/management/abo")}
        />
        <Tile
          icon={<Mic className="w-10 h-10 text-primary" />}
          title="Voice-Guthaben"
          description="Guthabenstand, Verlauf, Aufladen"
          onClick={() => navigate("/management/guthaben")}
        />
      </TileCategory>

      <TileCategory title="Daten & Tools">
        <Tile
          icon={<Upload className="w-10 h-10 text-primary" />}
          title="Import Center"
          description="Daten importieren aus Excel, CSV, anderen Apps"
          onClick={() => navigate("/management/import")}
        />
        <Tile
          icon={<Mic className="w-10 h-10 text-primary" />}
          title="Botschafter werden"
          description="Provision verdienen, Empfehlungslinks, Werbemittel"
          onClick={() => navigate("/management/botschafter")}
        />
      </TileCategory>

      {/* Berechtigungen & Hufi — inline Einstellungsbereich */}
      <div className="px-1">
        <HufiPermissionsSettings userId={user?.id ?? ""} />
      </div>

      {/* Abmelden */}
      <div className="px-1 pb-2">
        <button
          onClick={async () => { await logout(); }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 active:bg-destructive/10 transition-colors text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>

      {/* Danger Zone: Abo kündigen + Account löschen */}
      <div className="px-1 pb-4 space-y-2">
        <button
          onClick={() => setCancelDialogOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border text-muted-foreground hover:bg-muted/50 transition-colors text-sm font-medium"
        >
          <XCircle className="h-4 w-4" />
          Abo kündigen
        </button>
        <button
          onClick={() => setDeleteDialogOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 active:bg-destructive/10 transition-colors text-sm font-medium"
        >
          <Trash2 className="h-4 w-4" />
          Account und alle Daten löschen
        </button>
      </div>

      {/* Abo kündigen — Bestätigung */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abo kündigen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dein Abo läuft bis zum Ende des aktuellen Abrechnungszeitraums weiter.
              Bestehendes Voice-Guthaben bleibt bis zum Ablaufdatum nutzbar.
              Du wirst jetzt zum CopeCart-Kundenportal weitergeleitet, wo du die
              Kündigung selbst abschließt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>
              Weiter zu CopeCart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account löschen — doppelte Bestätigung */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              ALLE Daten werden unwiderruflich gelöscht: Pferde, Kunden, Termine,
              Rechnungen, Einstellungen. Diese Aktion kann nicht rückgängig gemacht
              werden.
              <br /><br />
              Gib zur Bestätigung <strong>LÖSCHEN</strong> ein:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="LÖSCHEN"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              disabled={deleteConfirmText !== "LÖSCHEN" || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
