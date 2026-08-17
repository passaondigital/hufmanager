import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  Briefcase,
  Mic,
  Shield,
  Smartphone,
  Share,
  Globe,
  MessageSquare,
  Scale,
  Calculator,
  Upload,
  LogOut,
  XCircle,
  Trash2,
  Loader2,
  Megaphone,
} from "lucide-react";
import { useLogout } from "@/hooks/useLogout";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { HufiPermissionsSettings } from "@/components/consent/HufiPermissionsSettings";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_FLAVOR, FLAVOR_CONFIG } from "@/config/appFlavor";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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

function PwaInstallCard() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();

  if (!isInstalled && !isIOS && !canInstall) return null;

  return (
    <div
      className="mx-1 rounded-2xl border p-4"
      style={{
        background: isInstalled
          ? "#F0FDF4"
          : "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
        borderColor: isInstalled ? "#BBF7D0" : "rgba(249,115,22,0.2)",
      }}
    >
      {isInstalled ? (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <Smartphone size={18} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-600">App installiert</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {FLAVOR_CONFIG.appName} läuft als Homescreen-App
            </div>
          </div>
        </div>
      ) : isIOS ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100">
              <Smartphone size={18} className="text-orange-500" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">App installieren</div>
              <div className="mt-0.5 text-xs text-slate-500">
                {FLAVOR_CONFIG.appName} zum Homescreen hinzufügen
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { icon: <Share size={14} />, text: 'Tippe auf "Teilen" in Safari' },
              { icon: "➕", text: '"Zum Home-Bildschirm" wählen' },
              { icon: "✓", text: '"Hinzufügen" tippen' },
            ].map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border border-orange-100 bg-white/70 px-3 py-2"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-500 text-xs font-bold text-white">
                  {step.icon}
                </div>
                <span className="text-xs text-slate-700">{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100">
            <Smartphone size={18} className="text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900">App installieren</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {FLAVOR_CONFIG.appName} direkt auf diesem Gerät installieren
            </div>
          </div>
          <button
            type="button"
            onClick={promptInstall}
            className="h-9 shrink-0 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white hover:bg-orange-600"
          >
            Installieren
          </button>
        </div>
      )}
    </div>
  );
}

export default function ManagementHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role } = useAuth();
  const logout = useLogout();
  const isHufiApp = ACTIVE_FLAVOR === "hufiapp";

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

      <TileCategory title="Mein Account">
        <Tile
          icon={<User className="h-10 w-10 text-primary" />}
          title="Mein Profil"
          description="Profil, Zertifikate, Fotos, Kontaktdaten, Qualifikationen"
          onClick={() => navigate("/management/profil")}
        />
        <Tile
          icon={<Shield className="h-10 w-10 text-primary" />}
          title="Sicherheit"
          description="Passwort ändern, E-Mail-Adresse, Zwei-Faktor-Authentifizierung"
          onClick={() => navigate("/management/sicherheit")}
        />
      </TileCategory>

      <TileCategory title="Business">
        <Tile
          icon={<Briefcase className="h-10 w-10 text-primary" />}
          title="Business-Einstellungen"
          description="Steuer, MwSt, Rechnungen, Preisanzeige, Bankdaten"
          onClick={() => navigate("/management/business")}
        />
        <Tile
          icon={<Globe className="h-10 w-10 text-primary" />}
          title="Meine Website"
          description="Landingpage, Logo, Farben, Angebot, Impressum"
          onClick={() => navigate("/management/website")}
        />
        <Tile
          icon={<MessageSquare className="h-10 w-10 text-primary" />}
          title="Kommunikation"
          description="E-Mail, WhatsApp, Benachrichtigungen, Erinnerungen"
          onClick={() => navigate("/management/kommunikation")}
        />
      </TileCategory>

      <TileCategory title="Recht & Steuer">
        <Tile
          icon={<Scale className="h-10 w-10 text-primary" />}
          title="Rechtliches"
          description="AGB, Datenschutz, Widerruf, Impressum"
          onClick={() => navigate("/management/rechtliches")}
        />
        <Tile
          icon={<Calculator className="h-10 w-10 text-primary" />}
          title="Steuer"
          description="Steuernummer, MwSt, Kleinunternehmer, DATEV"
          onClick={() => navigate("/management/steuer")}
        />
        <Tile
          icon={<Upload className="h-10 w-10 text-primary" />}
          title="Abo & Lizenz"
          description="Aktueller Plan, Upgrade, Rechnungen, Kündigung"
          onClick={() => navigate("/management/abo")}
        />
        {isHufiApp && (
          <Tile
            icon={<Mic className="h-10 w-10 text-primary" />}
            title="Voice-Guthaben"
            description="Guthabenstand, Verlauf, Aufladen"
            onClick={() => navigate("/management/guthaben")}
          />
        )}
      </TileCategory>

      <TileCategory title="Daten & Tools">
        <Tile
          icon={<Upload className="h-10 w-10 text-primary" />}
          title="Import Center"
          description="Daten importieren aus Excel, CSV, anderen Apps"
          onClick={() => navigate("/management/import")}
        />
        <Tile
          icon={<Megaphone className="h-10 w-10 text-primary" />}
          title="Botschafter werden"
          description="Provision verdienen, Empfehlungslinks, Werbemittel"
          onClick={() => navigate("/management/botschafter")}
        />
      </TileCategory>

      {isHufiApp && (
        <div className="px-1">
          <HufiPermissionsSettings userId={user?.id ?? ""} role={role} />
        </div>
      )}

      <div className="px-1 pb-2">
        <button
          onClick={async () => {
            await logout();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 active:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>

      {/* Installationsfunktion bewusst direkt unter Abmelden. */}
      <PwaInstallCard />

      <div className="space-y-2 px-1 pb-4">
        <button
          onClick={() => setCancelDialogOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <XCircle className="h-4 w-4" />
          Abo kündigen
        </button>
        <button
          onClick={() => setDeleteDialogOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 active:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          Account und alle Daten löschen
        </button>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abo kündigen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dein Abo läuft bis zum Ende des aktuellen Abrechnungszeitraums weiter.
              {isHufiApp && <> Bestehendes Voice-Guthaben bleibt bis zum Ablaufdatum nutzbar.</>}{" "}
              Du wirst jetzt zum CopeCart-Kundenportal weitergeleitet, wo du die Kündigung selbst abschließt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>Weiter zu CopeCart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteConfirmText("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              ALLE Daten werden unwiderruflich gelöscht: Pferde, Kunden, Termine, Rechnungen, Einstellungen.
              Diese Aktion kann nicht rückgängig gemacht werden.
              <br />
              <br />
              Gib zur Bestätigung <strong>LÖSCHEN</strong> ein:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
            placeholder="LÖSCHEN"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleDeleteAccount();
              }}
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
