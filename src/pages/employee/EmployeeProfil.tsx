import { useState, useRef } from "react";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import {
  User, Mail, Phone, Calendar, Briefcase, Shield, LogOut,
  CheckCircle, XCircle, Key, Loader2, Download, Trash2, AlertTriangle,
  Camera, Save, Edit2, Globe,
} from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface EmployeeProfilProps {
  section?: "profil" | "einstellungen";
  hideChrome?: boolean;
}

const EmployeeProfil = ({ section, hideChrome }: EmployeeProfilProps = {}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useEmployeeProfile();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password dialog
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
  const statusLabel = { active: "Aktiv", sick: "Krank", vacation: "Urlaub", suspended: "Gesperrt", inactive: "Inaktiv" }[profile.status] || profile.status;

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

  const startEditing = () => {
    setEditName(profile.full_name || "");
    setEditPhone(profile.phone || "");
    setEditBio((profile as any).bio || "");
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!profile?.id || !user?.id) return;
    setSaving(true);
    try {
      // Validate phone for DACH
      if (editPhone && !/^(\+49|\+43|\+41|0)[0-9\s\-\/]{6,15}$/.test(editPhone.replace(/\s/g, ""))) {
        toast.error("Ungültige Telefonnummer — Bitte DACH-Format verwenden (+49, +43, +41 oder 0...)");
        setSaving(false);
        return;
      }

      // Update employee_profiles
      await supabase
        .from("employee_profiles")
        .update({ full_name: editName, phone: editPhone, bio: editBio })
        .eq("id", profile.id);

      // Update profiles table too
      await supabase
        .from("profiles")
        .update({ full_name: editName, phone: editPhone })
        .eq("id", user.id);

      queryClient.invalidateQueries({ queryKey: ["employee-profile"] });
      toast.success("Profil gespeichert ✓");
      setEditing(false);
    } catch (err: any) {
      toast.error(`Fehler: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Datei zu groß — Max. 2 MB erlaubt.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("employee-avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("employee-avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from("employee_profiles").update({ avatar_url: avatarUrl }).eq("id", profile.id);
      await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);

      queryClient.invalidateQueries({ queryKey: ["employee-profile"] });
      toast.success("Profilbild aktualisiert ✓");
    } catch (err: any) {
      toast.error(`Upload fehlgeschlagen: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error("Mindestens 6 Zeichen erforderlich.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein.");
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) {
      toast.error(`Fehler: ${error.message}`);
    } else {
      toast.success("Passwort geändert");
      setShowPwDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "LÖSCHEN" || !user?.id) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_employee_account", { _employee_user_id: user.id });
      if (error) throw error;
      toast.success("Konto gelöscht");
      await signOut();
      navigate("/");
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const showProfil = !section || section === "profil";
  const showEinstellungen = !section || section === "einstellungen";

  return (
    <div className="space-y-4 animate-fade-in max-w-lg mx-auto">
      {!hideChrome && (
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">Mein Profil <HelpTip id="mitarbeiter.profil" /></h1>
          {!editing && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={startEditing}>
              <Edit2 className="h-3.5 w-3.5" /> Bearbeiten
            </Button>
          )}
        </div>
      )}
      {hideChrome && showProfil && !editing && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={startEditing}>
            <Edit2 className="h-3.5 w-3.5" /> Bearbeiten
          </Button>
        </div>
      )}

      {showProfil && <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">{getInitials(profile.full_name)}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="flex-1">
              {editing ? (
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Vor- und Nachname" className="mb-2" />
              ) : (
                <h2 className="text-lg font-semibold">{profile.full_name}</h2>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{roleLabel}</Badge>
                <Badge variant={profile.status === "active" ? "default" : "outline"}>{statusLabel}</Badge>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profile.email}</span>
            </div>
            {editing ? (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+49 170 1234567" className="flex-1" />
              </div>
            ) : profile.phone ? (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile.phone}</span>
              </div>
            ) : null}
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

          {editing && (
            <>
              <Separator className="my-4" />
              <div>
                <label className="text-sm font-medium mb-1.5 block">Über mich (max. 200 Zeichen)</label>
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value.slice(0, 200))}
                  placeholder="Kurze Vorstellung..."
                  className="resize-none"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">{editBio.length}/200</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Abbrechen</Button>
                <Button className="flex-1 gap-1.5" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Speichern
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>}

      {showProfil && <Card>
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
              {p.value ? <CheckCircle className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-muted-foreground/50" />}
            </div>
          ))}
          <Separator className="my-2" />
          <p className="text-xs font-medium text-muted-foreground mb-1">App-Module</p>
          {appPermissions.map((p) => (
            <div key={p.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{p.label}</span>
              {p.value ? <CheckCircle className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-muted-foreground/50" />}
            </div>
          ))}
        </CardContent>
      </Card>}

      {showProfil && <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Download className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">App installieren</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Installiere die MitarbeiterApp auf deinem Gerät.</p>
          <PWAInstallButton />
        </CardContent>
      </Card>}

      {showEinstellungen && <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Regionale Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Land</label>
            <Select
              defaultValue={(profile as any).country || "DE"}
              onValueChange={async (val) => {
                await supabase.from("employee_profiles").update({ country: val }).eq("id", profile.id);
                queryClient.invalidateQueries({ queryKey: ["employee-profile"] });
                toast({ title: "Land aktualisiert" });
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DE">🇩🇪 Deutschland</SelectItem>
                <SelectItem value="AT">🇦🇹 Österreich</SelectItem>
                <SelectItem value="CH">🇨🇭 Schweiz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground p-2.5 bg-muted/50 rounded-lg">
            <p className="font-medium mb-1">Überstunden-Grenzen:</p>
            {((profile as any).country || "DE") === "DE" && <p>Max. 10h/Tag, 48h/Woche (ArbZG Deutschland)</p>}
            {(profile as any).country === "AT" && <p>Max. 10h/Tag, 50h/Woche (AZG Österreich)</p>}
            {(profile as any).country === "CH" && <p>Max. 14h/Tag (Ausnahme), 45h/Woche (ArG Schweiz)</p>}
          </div>
        </CardContent>
      </Card>}

      {showEinstellungen && (
        <>
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowPwDialog(true)}>
            <Key className="h-4 w-4" />Passwort ändern
          </Button>

          <Button variant="destructive" className="w-full gap-2" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />Abmelden
          </Button>

          <Separator />
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Konto & Daten löschen</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Lösche dein Mitarbeiterkonto und alle damit verbundenen Daten unwiderruflich.
              </p>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowDeleteStep1(true)}>
                Konto löschen
          </Button>
        </CardContent>
          </Card>
        </>
      )}

      {/* Password Dialog */}
      <Dialog open={showPwDialog} onOpenChange={setShowPwDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Passwort ändern</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Neues Passwort</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mind. 6 Zeichen" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Passwort bestätigen</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPwDialog(false)}>Abbrechen</Button>
            <Button onClick={handlePasswordChange} disabled={changingPw || !newPassword}>
              {changingPw && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ändern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Step 1 */}
      <Dialog open={showDeleteStep1} onOpenChange={setShowDeleteStep1}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />Konto löschen — Was wird entfernt?
            </DialogTitle>
            <DialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="font-medium">Folgende Daten werden gelöscht:</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-destructive" />Dein Mitarbeiterprofil und Login</li>
              <li className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-destructive" />Alle offenen Aufträge</li>
              <li className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-destructive" />Deine Dokumentationen und Befunde</li>
              <li className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-destructive" />Abwesenheitsanträge und Materialzuweisungen</li>
            </ul>
            <div className="p-3 bg-muted/50 rounded-lg text-xs">
              <p className="font-medium mb-1">Was bleibt erhalten:</p>
              <p className="text-muted-foreground">Betriebsdaten deines Providers bleiben unberührt.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteStep1(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={() => { setShowDeleteStep1(false); setShowDeleteStep2(true); }}>Ich verstehe — weiter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Step 2 */}
      <Dialog open={showDeleteStep2} onOpenChange={(open) => { setShowDeleteStep2(open); if (!open) setDeleteConfirmText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Endgültige Bestätigung</DialogTitle>
            <DialogDescription>Tippe <span className="font-mono font-bold">LÖSCHEN</span> ein.</DialogDescription>
          </DialogHeader>
          <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder='Tippe "LÖSCHEN" ein' className="font-mono" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteStep2(false); setDeleteConfirmText(""); }}>Abbrechen</Button>
            <Button variant="destructive" disabled={deleteConfirmText !== "LÖSCHEN" || deleting} onClick={handleDeleteAccount}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Konto endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeProfil;
