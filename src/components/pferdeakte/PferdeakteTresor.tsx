import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Lock, Upload, Download, Trash2, FileText, Loader2, ShieldAlert, Eye,
  KeyRound, Phone, AlertTriangle, Shield, Crown, CheckCircle, Plus,
  FileCheck, Car
} from "lucide-react";
import { toast } from "sonner";
import { uploadFile, getStorageUrl } from "@/lib/storage";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { DemoFeatureHighlight } from "@/components/demo/DemoFeatureHighlight";
import { EmergencyQRCode } from "./EmergencyQRCode";

interface PferdeakteTresorProps {
  horseId: string;
  horse?: any;
}

const VAULT_CATEGORIES = [
  { value: "equidenpass", label: "Equidenpass", icon: FileText },
  { value: "kaufvertrag", label: "Kaufvertrag", icon: FileCheck },
  { value: "versicherungspolice", label: "Versicherungspolice", icon: Shield },
  { value: "eigentumsurkunde", label: "Eigentumsurkunde", icon: FileCheck },
  { value: "aku", label: "AKU-Bericht", icon: FileText },
  { value: "schutzvertrag", label: "Schutzvertrag", icon: Shield },
  { value: "rechtsdokumente", label: "Sonstige Rechtsdokumente", icon: FileText },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  VAULT_CATEGORIES.map(c => [c.value, c.label])
);

interface VaultDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  category: string;
  created_at: string;
}

interface AccessLogEntry {
  id: string;
  accessed_at: string;
  reason: string;
  documents_viewed: string[];
}

type VaultState = "loading" | "setup_pin" | "enter_pin" | "locked" | "unlocked";

export function PferdeakteTresor({ horseId, horse }: PferdeakteTresorProps) {
  const { user } = useAuth();
  const [state, setState] = useState<VaultState>("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [storedHash, setStoredHash] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [processing, setProcessing] = useState(false);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<VaultDocument | null>(null);
  const [showAccessLog, setShowAccessLog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Premium check - simple: if vault_pin exists, they have access
  const [isPremium] = useState(true); // TODO: check subscription

  useEffect(() => {
    checkVaultStatus();
  }, [user]);

  const checkVaultStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("vault_pin, vault_locked_until, vault_failed_attempts")
      .eq("id", user.id)
      .single();

    if (data) {
      setStoredHash((data as any).vault_pin || null);
      setFailedAttempts((data as any).vault_failed_attempts || 0);
      const locked = (data as any).vault_locked_until;
      if (locked && new Date(locked) > new Date()) {
        setLockedUntil(new Date(locked));
        setState("locked");
      } else if (!(data as any).vault_pin) {
        setState("setup_pin");
      } else {
        setState("enter_pin");
      }
    }
  };

  const hashPin = async (pinValue: string) => {
    const { data, error } = await supabase.functions.invoke("hash-password", {
      body: { action: "hash", password: pinValue },
    });
    if (error) throw error;
    return data.hash;
  };

  const verifyPin = async (pinValue: string, hash: string) => {
    const { data, error } = await supabase.functions.invoke("hash-password", {
      body: { action: "verify", password: pinValue, hash },
    });
    if (error) throw error;
    return data.match;
  };

  const handleSetupPin = async () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      toast.error("PIN muss 6 Ziffern haben");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PINs stimmen nicht überein");
      return;
    }
    setProcessing(true);
    try {
      const hash = await hashPin(pin);
      await supabase
        .from("profiles")
        .update({ vault_pin: hash, vault_failed_attempts: 0 } as any)
        .eq("id", user!.id);
      setStoredHash(hash);
      setState("unlocked");
      toast.success("Tresor-PIN erstellt");
      fetchVaultData();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Erstellen des PINs");
    } finally {
      setProcessing(false);
      setPin("");
      setConfirmPin("");
    }
  };

  const handleUnlock = async () => {
    if (pin.length !== 6) {
      toast.error("Bitte 6-stelligen PIN eingeben");
      return;
    }
    setProcessing(true);
    try {
      const match = await verifyPin(pin, storedHash!);
      if (match) {
        await supabase
          .from("profiles")
          .update({ vault_failed_attempts: 0, vault_locked_until: null } as any)
          .eq("id", user!.id);
        setState("unlocked");
        setFailedAttempts(0);
        fetchVaultData();
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 3) {
          const lockTime = new Date(Date.now() + 30 * 60 * 1000);
          await supabase
            .from("profiles")
            .update({ vault_failed_attempts: newAttempts, vault_locked_until: lockTime.toISOString() } as any)
            .eq("id", user!.id);
          setLockedUntil(lockTime);
          setState("locked");
          toast.error("3 Fehlversuche – Tresor für 30 Minuten gesperrt");
        } else {
          await supabase
            .from("profiles")
            .update({ vault_failed_attempts: newAttempts } as any)
            .eq("id", user!.id);
          toast.error(`Falscher PIN (${3 - newAttempts} Versuche übrig)`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Fehler bei der PIN-Prüfung");
    } finally {
      setProcessing(false);
      setPin("");
    }
  };

  const fetchVaultData = async () => {
    if (!user) return;
    const [docsRes, logRes] = await Promise.all([
      supabase
        .from("vault_documents")
        .select("id, file_name, file_url, file_type, category, created_at")
        .eq("horse_id", horseId)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("vault_access_log")
        .select("id, accessed_at, reason, documents_viewed")
        .eq("horse_id", horseId)
        .eq("owner_id", user.id)
        .order("accessed_at", { ascending: false })
        .limit(20),
    ]);
    setDocuments((docsRes.data || []) as VaultDocument[]);
    setAccessLog((logRes.data || []) as AccessLogEntry[]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedCategory || !user) return;
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${horseId}/${fileName}`;
      const { path, error: uploadError } = await uploadFile('horse-vault', filePath, selectedFile);
      if (uploadError || !path) throw uploadError || new Error("Upload fehlgeschlagen");
      await supabase.from("vault_documents").insert({
        horse_id: horseId, owner_id: user.id, file_name: selectedFile.name,
        file_url: filePath, file_type: selectedFile.type, category: selectedCategory,
      } as any);
      toast.success("Dokument im Tresor gespeichert");
      setShowUploadDialog(false);
      setSelectedCategory("");
      setSelectedFile(null);
      fetchVaultData();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc || !user) return;
    try {
      await supabase.storage.from('horse-vault').remove([deleteDoc.file_url]);
      await supabase.from("vault_documents").delete().eq("id", deleteDoc.id);
      toast.success("Dokument gelöscht");
      fetchVaultData();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Löschen");
    } finally {
      setDeleteDoc(null);
    }
  };

  const handleDownload = async (doc: VaultDocument) => {
    const url = await getStorageUrl('horse-vault', doc.file_url);
    if (url) window.open(url, '_blank');
    else toast.error("Download fehlgeschlagen");
  };

  // Emergency contacts from horse
  const emergencyContacts = horse?.contacts
    ? Object.entries(horse.contacts as Record<string, any>)
        .filter(([_, v]) => v && (v.name || v.phone))
        .map(([key, v]: [string, any]) => ({ role: key, name: v.name, phone: v.phone, email: v.email }))
    : [];

  // ─── PREMIUM GATE ───
  if (!isPremium) {
    return (
      <div className="space-y-4">
        {/* Premium Header */}
        <div className="rounded-xl bg-[hsl(var(--card))] border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-[#0A0700] to-[#1a1400] p-5 flex items-center gap-3">
            <Lock className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <h3 className="text-base font-bold text-white">PostIdent-gesicherter Tresor</h3>
              <p className="text-xs text-white/60">Schütze deine wichtigsten Dokumente</p>
            </div>
            <Badge className="bg-primary/20 text-primary border-primary/30">Premium</Badge>
          </div>
          <div className="p-6 space-y-4">
            {/* Blurred preview */}
            <div className="relative">
              <div className="space-y-2 blur-sm pointer-events-none select-none">
                {["Equidenpass", "Kaufvertrag", "Versicherung"].map(t => (
                  <div key={t} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">{t}</span>
                    <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg">
                <Crown className="h-10 w-10 text-primary mb-3" />
                <h4 className="text-base font-bold text-foreground mb-1">Tresor freischalten</h4>
                <p className="text-xs text-muted-foreground text-center max-w-[250px] mb-4">
                  PostIdent-gesichert · Kaufverträge & Versicherungen · QR-Notfall-Zugang · Besitzerwechsel
                </p>
                <Button className="gap-2">
                  <Crown className="h-4 w-4" />
                  Tresor aktivieren
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LOADING ───
  if (state === "loading") {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  // ─── LOCKED ───
  if (state === "locked") {
    return (
      <div className="space-y-4">
        <TresorHeader />
        <Card className="border-destructive/30">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-foreground mb-2">Tresor gesperrt</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Zu viele Fehlversuche. Gesperrt bis{" "}
              <strong>{lockedUntil ? format(lockedUntil, "HH:mm 'Uhr'", { locale: de }) : "—"}</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── SETUP PIN ───
  if (state === "setup_pin") {
    return (
      <div className="space-y-4">
        <TresorHeader />
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="text-center">
              <KeyRound className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-foreground">Tresor-PIN erstellen</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Lege einen 6-stelligen PIN fest um deinen Tresor zu schützen.
              </p>
            </div>
            <div>
              <Label>Neuer PIN (6 Ziffern)</Label>
              <Input type="password" inputMode="numeric" maxLength={6}
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••" className="text-center text-lg tracking-[0.5em]" />
            </div>
            <div>
              <Label>PIN bestätigen</Label>
              <Input type="password" inputMode="numeric" maxLength={6}
                value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••" className="text-center text-lg tracking-[0.5em]" />
            </div>
            <Button onClick={handleSetupPin} disabled={processing} className="w-full">
              {processing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Tresor aktivieren
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── ENTER PIN ───
  if (state === "enter_pin") {
    return (
      <div className="space-y-4">
        <TresorHeader />
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="text-center">
              <Lock className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-foreground">Tresor entsperren</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Gib deinen 6-stelligen PIN ein.
              </p>
            </div>
            <Input type="password" inputMode="numeric" maxLength={6}
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••" className="text-center text-lg tracking-[0.5em]"
              onKeyDown={e => e.key === "Enter" && handleUnlock()} />
            {failedAttempts > 0 && (
              <p className="text-xs text-destructive text-center">{3 - failedAttempts} Versuche übrig</p>
            )}
            <Button onClick={handleUnlock} disabled={processing} className="w-full">
              {processing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Entsperren
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── UNLOCKED STATE ───
  return (
    <div className="space-y-4">
      <DemoFeatureHighlight label="PostIdent-gesicherter Dokumenten-Tresor" delay={500} />
      <TresorHeader verified />

      {/* Notfall-Kontakt Bar */}
      {emergencyContacts.length > 0 && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Notfall-Kontakte</span>
          </div>
          {emergencyContacts.slice(0, 3).map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-foreground font-medium">{c.name || c.role}</span>
              <span className="text-xs text-muted-foreground capitalize">({c.role})</span>
              {c.phone && (
                <a href={`tel:${c.phone}`} className="ml-auto">
                  <Button variant="ghost" size="sm" className="gap-1 h-7 text-destructive">
                    <Phone className="h-3.5 w-3.5" /> Anrufen
                  </Button>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* QR-Code Notfall-Zugang */}
      <EmergencyQRCode
        horseId={horseId}
        horseName={horse?.name || "Pferd"}
        horseEqid={horse?.readable_id || ""}
      />

      {/* Versicherungs-Schnellansicht */}
      {(horse?.insurance_company || horse?.insurance_type) && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {horse.insurance_company || "Versicherung"}
              </p>
              <p className="text-xs text-muted-foreground">
                {[horse.insurance_type, horse.insurance_number].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Badge variant="secondary" className="text-primary border-primary/20 bg-primary/10">Aktiv</Badge>
          </CardContent>
        </Card>
      )}

      {/* Unlock status + access log */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5 text-green-600">
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Tresor entsperrt</span>
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => setShowAccessLog(true)} className="h-7 text-xs gap-1">
          <Eye className="h-3.5 w-3.5" /> Zugriffs-Log
        </Button>
      </div>

      {/* Documents List */}
      <div className="space-y-2">
        {VAULT_CATEGORIES.map(cat => {
          const doc = documents.find(d => d.category === cat.value);
          const Icon = cat.icon;
          return (
            <Card key={cat.value} className={doc ? "border-green-500/20" : "border-dashed"}>
              <CardContent className="p-3 flex items-center gap-3">
                <Icon className={`h-5 w-5 ${doc ? "text-green-600" : "text-muted-foreground/40"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${doc ? "text-foreground" : "text-muted-foreground"}`}>
                    {cat.label}
                  </p>
                  {doc && (
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.file_name} · {format(new Date(doc.created_at), "dd.MM.yyyy", { locale: de })}
                    </p>
                  )}
                </div>
                {doc ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteDoc(doc)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1"
                    onClick={() => { setSelectedCategory(cat.value); setShowUploadDialog(true); }}>
                    <Plus className="h-3.5 w-3.5" /> Hochladen
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Additional documents not matching categories */}
        {documents.filter(d => !VAULT_CATEGORIES.some(c => c.value === d.category)).map(doc => (
          <Card key={doc.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.category} · {format(new Date(doc.created_at), "dd.MM.yyyy", { locale: de })}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteDoc(doc)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Add more */}
        <button
          onClick={() => setShowUploadDialog(true)}
          className="w-full border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          Weiteres Dokument hinzufügen
        </button>
      </div>

      {/* Besitzerwechsel */}
      <Card className="border-muted">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">Besitzerwechsel</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Bei Verkauf können Tresor-Inhalte vollständig oder selektiv an den neuen Besitzer übertragen werden.
            PostIdent-Verifizierung beider Parteien erforderlich.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5">
            Besitzerwechsel starten
          </Button>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Dokument in Tresor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kategorie *</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue placeholder="Kategorie wählen" /></SelectTrigger>
                <SelectContent>
                  {VAULT_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <input type="file" ref={fileInputRef}
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                accept="image/*,.pdf" className="hidden" />
              <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : "Datei wählen"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); setSelectedCategory(""); setSelectedFile(null); }}>
              Abbrechen
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile || !selectedCategory}>
              {uploading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Log Dialog */}
      <Dialog open={showAccessLog} onOpenChange={setShowAccessLog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Zugriffs-Protokoll
            </DialogTitle>
          </DialogHeader>
          {accessLog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Keine Zugriffe protokolliert</p>
          ) : (
            <div className="space-y-3">
              {accessLog.map(entry => (
                <Card key={entry.id}>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.accessed_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </p>
                    <p className="text-sm text-foreground mt-1"><strong>Grund:</strong> {entry.reason}</p>
                    {entry.documents_viewed?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Eingesehen: {entry.documents_viewed.join(", ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument aus Tresor löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteDoc?.file_name}" wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TresorHeader({ verified }: { verified?: boolean }) {
  return (
    <div className="rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-[#0A0700] to-[#1a1400] p-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-white">PostIdent-gesicherter Tresor</h3>
          {verified ? (
            <p className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Verifiziert
            </p>
          ) : (
            <p className="text-xs text-primary">Identität noch nicht verifiziert</p>
          )}
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Premium</Badge>
      </div>
    </div>
  );
}
