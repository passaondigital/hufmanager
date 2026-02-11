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
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Shield,
  LogOut,
  CheckCircle,
  XCircle,
  Key,
  Loader2,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const EmployeeProfil = () => {
  const { signOut } = useAuth();
  const { data: profile } = useEmployeeProfile();
  const { toast } = useToast();
  const [showPwDialog, setShowPwDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

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
    </div>
  );
};

export default EmployeeProfil;
