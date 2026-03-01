import { useState } from "react";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import {
  User, Mail, Phone, Calendar, Briefcase, Shield, LogOut,
  CheckCircle, XCircle, Key, Loader2, Download, Trash2, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

const EmployeeProfil = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useEmployeeProfile();
  const { toast } = useToast();
  const [showPwDialog, setShowPwDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // DSGVO deletion state
  const [showDeleteStep1, setShowDeleteStep1] = useState(false);
  const [showDeleteStep2, setShowDeleteStep2] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!profile) return null;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const roleLabel = profile.role === "team_lead" ? "Teamleiter" : profile.role === "employee" ? "Mitarbeiter" : "Assistent";
  const statusLabel = {
    active: "Aktiv",
    sick: "Krank",
    vacation: "Urlaub",
    suspended: "Gesperrt",
    inactive: "Inaktiv",
  }[profile.status] || profile.status;

  const permissions = [
    { label: "Alleine arbeiten", value: profile.can_work_alone },
    { label: "Hufschutz anbringen", value: profile.can_apply_hoof_protection },
    { label: "Sensible Kunden", value: profile.can_work_sensitive_clients },
  ];

  const customPerms = profile.custom_permissions || {};
  const appPermissions = [
    { label: "Maps / Navigation", value: customPerms.can_use_maps },
    { label: "Tour-Manager", value: customPerms.can_use_tour_manager },
    { label: "Kundenchat", value: customPerms.can_chat_clients },
  ];

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Fehler", description: "Mindestens 6 Zeichen erforderlich.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Fehler", description: "Passwörter stimmen nicht überein.", variant: "destructive" });
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Passwort geändert", description: "Dein Passwort wurde erfolgreich aktualisiert." });
      setShowPwDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "LÖSCHEN" || !user?.id) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_employee_account", {
        _employee_user_id: user.id,
      });
      if (error) throw error;

      toast({ title: "Konto gelöscht", description: "Dein Konto und deine Daten wurden gelöscht." });
      await signOut();
      navigate("/");
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message || "Konto konnte nicht gelöscht werden.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-lg mx-auto">
      <h1 className="text-xl font-bold">Mein Profil</h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{profile.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{roleLabel}</Badge>
                <Badge variant={profile.status === "active" ? "default" : "outline"}>
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profile.email}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{profile.employment_type === "contractor" ? "Selbstständig" : "Angestellt"}</span>
            </div>
            {profile.contract_start_date && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Seit {format(new Date(profile.contract_start_date), "dd.MM.yyyy", { locale: de })}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Berechtigungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {permissions.map((p) => (
            <div key={p.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{p.label}</span>
              {p.value ? (
                <CheckCircle className="h-4 w-4 text-primary" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground/50" />
              )}
            </div>
          ))}
          <Separator className="my-2" />
          <p className="text-xs font-medium text-muted-foreground mb-1">App-Module</p>
          {appPermissions.map((p) => (
            <div key={p.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{p.label}</span>
              {p.value ? (
                <CheckCircle className="h-4 w-4 text-primary" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground/50" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* PWA Install */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Download className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">App installieren</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Installiere die MitarbeiterApp auf deinem Gerät für schnellen Zugriff.
          </p>
          <PWAInstallButton />
        </CardContent>
      </Card>

      {/* Password change */}
      <Button variant="outline" className="w-full gap-2" onClick={() => setShowPwDialog(true)}>
        <Key className="h-4 w-4" />
        Passwort ändern
      </Button>

      <Button variant="destructive" className="w-full gap-2" onClick={() => signOut()}>
        <LogOut className="h-4 w-4" />
        Abmelden
      </Button>

      {/* DSGVO: Account deletion */}
      <Separator />
      <Card className="border-destructive/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Konto & Daten löschen</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Lösche dein Mitarbeiterkonto und alle damit verbundenen Daten unwiderruflich. 
            Die Betriebsdaten deines Providers bleiben erhalten.
          </p>
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowDeleteStep1(true)}>
            Konto löschen
          </Button>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={showPwDialog} onOpenChange={setShowPwDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Neues Passwort</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mind. 6 Zeichen" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Passwort bestätigen</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Passwort wiederholen" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPwDialog(false)}>Abbrechen</Button>
            <Button onClick={handlePasswordChange} disabled={changingPw || !newPassword}>
              {changingPw && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ändern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Step 1: Warning */}
      <Dialog open={showDeleteStep1} onOpenChange={setShowDeleteStep1}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Konto löschen — Was wird entfernt?
            </DialogTitle>
            <DialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="font-medium">Folgende Daten werden gelöscht:</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                Dein Mitarbeiterprofil und Login
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                Alle offenen Aufträge (werden storniert)
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                Deine Dokumentationen und Befunde
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                Abwesenheitsanträge und Materialzuweisungen
              </li>
            </ul>
            <div className="p-3 bg-muted/50 rounded-lg text-xs">
              <p className="font-medium mb-1">Was bleibt erhalten:</p>
              <p className="text-muted-foreground">
                Betriebsdaten deines Providers (Kunden, Pferde, Rechnungen) bleiben unberührt. 
                Dein Provider wird über die Löschung benachrichtigt.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteStep1(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={() => { setShowDeleteStep1(false); setShowDeleteStep2(true); }}>
              Ich verstehe — weiter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Step 2: Confirmation */}
      <Dialog open={showDeleteStep2} onOpenChange={(open) => { setShowDeleteStep2(open); if (!open) setDeleteConfirmText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Endgültige Bestätigung</DialogTitle>
            <DialogDescription>
              Tippe <span className="font-mono font-bold">LÖSCHEN</span> ein, um dein Konto unwiderruflich zu löschen.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder='Tippe "LÖSCHEN" ein'
            className="font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteStep2(false); setDeleteConfirmText(""); }}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "LÖSCHEN" || deleting}
              onClick={handleDeleteAccount}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Konto endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeProfil;
