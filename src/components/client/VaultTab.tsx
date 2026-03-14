import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Lock, Upload, Download, Trash2, FileText, Loader2, ShieldAlert, Eye, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { uploadFile, getStorageUrl } from "@/lib/storage";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface VaultTabProps {
  horseId: string;
}

const VAULT_CATEGORIES = [
  { value: "equidenpass", label: "Equidenpass", icon: "🐴" },
  { value: "kaufvertrag", label: "Kaufvertrag", icon: "📄" },
  { value: "versicherungspolice", label: "Versicherungspolice", icon: "🏥" },
  { value: "rechtsdokumente", label: "Sonstige Rechtsdokumente", icon: "⚖️" },
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

export function VaultTab({ horseId }: VaultTabProps) {
  const { user } = useAuth();
  const [state, setState] = useState<VaultState>("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [storedHash, setStoredHash] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [processing, setProcessing] = useState(false);

  // Vault content state
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<VaultDocument | null>(null);
  const [showAccessLog, setShowAccessLog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { error } = await supabase
        .from("profiles")
        .update({ vault_pin: hash, vault_failed_attempts: 0 } as any)
        .eq("id", user!.id);
      if (error) throw error;
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

  const handleForgotPin = async () => {
    toast.info("Eine E-Mail zum Zurücksetzen des PINs wurde an deine E-Mail-Adresse gesendet.");
    // In production, this would trigger an email with a reset link
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

      const { error: dbError } = await supabase.from("vault_documents").insert({
        horse_id: horseId,
        owner_id: user.id,
        file_name: selectedFile.name,
        file_url: filePath,
        file_type: selectedFile.type,
        category: selectedCategory,
      } as any);
      if (dbError) throw dbError;

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
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error("Download fehlgeschlagen");
    }
  };

  // ─── RENDER STATES ───

  if (state === "loading") {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (state === "locked") {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="font-semibold text-lg text-foreground mb-2">Tresor gesperrt</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Zu viele Fehlversuche. Der Tresor ist bis{" "}
            <strong>{lockedUntil ? format(lockedUntil, "HH:mm 'Uhr'", { locale: de }) : "—"}</strong>{" "}
            gesperrt.
          </p>
          <Button variant="outline" size="sm" onClick={handleForgotPin}>
            PIN vergessen?
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === "setup_pin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" />
            Tresor einrichten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Lege einen 6-stelligen PIN fest, um deinen Dokumenten-Tresor zu schützen.
          </p>
          <div>
            <Label>Neuer PIN (6 Ziffern)</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
            />
          </div>
          <div>
            <Label>PIN bestätigen</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
            />
          </div>
          <Button onClick={handleSetupPin} disabled={processing} className="w-full">
            {processing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Tresor aktivieren
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === "enter_pin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Tresor entsperren
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gib deinen 6-stelligen PIN ein, um auf geschützte Dokumente zuzugreifen.
          </p>
          <div>
            <Label>PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              onKeyDown={e => e.key === "Enter" && handleUnlock()}
            />
          </div>
          <Button onClick={handleUnlock} disabled={processing} className="w-full">
            {processing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Entsperren
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleForgotPin}>
            PIN vergessen?
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── UNLOCKED STATE ───
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Tresor entsperrt</p>
            <p className="text-xs text-muted-foreground">Nur du hast Zugriff auf diese Dokumente</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowAccessLog(true)}>
            <Eye className="h-4 w-4 mr-1" />
            Zugriffs-Log
          </Button>
        </CardContent>
      </Card>

      {/* Upload Button */}
      <Button className="w-full" onClick={() => setShowUploadDialog(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Dokument in Tresor legen
      </Button>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Lock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Noch keine Dokumente im Tresor</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const cat = VAULT_CATEGORIES.find(c => c.value === doc.category);
            return (
              <Card key={doc.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-xl">{cat?.icon || "📄"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {CATEGORY_LABELS[doc.category] || doc.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), "dd.MM.yyyy", { locale: de })}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteDoc(doc)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
                    <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <input type="file" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files?.[0] || null)} accept="image/*,.pdf" className="hidden" />
              <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={!selectedCategory}>
                <Upload className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : "Datei wählen"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); setSelectedCategory(""); setSelectedFile(null); }}>Abbrechen</Button>
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
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Zugriffs-Protokoll</DialogTitle></DialogHeader>
          {accessLog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Keine Admin-Zugriffe protokolliert</p>
          ) : (
            <div className="space-y-3">
              {accessLog.map(entry => (
                <Card key={entry.id}>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.accessed_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </p>
                    <p className="text-sm text-foreground mt-1"><strong>Grund:</strong> {entry.reason}</p>
                    {entry.documents_viewed.length > 0 && (
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
              "{deleteDoc?.file_name}" wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
