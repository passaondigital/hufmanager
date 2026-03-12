import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logHorseAction } from "@/utils/auditLog";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface TransferData {
  id: string;
  horse_id: string;
  seller_id: string;
  buyer_email: string;
  status: string;
  initiated_at: string;
  expires_at: string;
  shared_password_hash: string;
  horse_name?: string;
  horse_breed?: string;
  horse_color?: string;
  horse_photo_url?: string;
  seller_name?: string;
}

export function HorseTransferReceive() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<TransferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferData | null>(null);
  const [buyerStep, setBuyerStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) fetchPendingTransfers();
  }, [user]);

  const fetchPendingTransfers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("horse_transfers")
        .select("id, horse_id, seller_id, buyer_email, status, initiated_at, expires_at, shared_password_hash")
        .eq("buyer_id", user.id)
        .in("status", ["initiated", "buyer_found", "docs_pending", "password_pending"])
        .order("initiated_at", { ascending: false });

      if (error) throw error;

      // Enrich with horse + seller data
      const enriched: TransferData[] = [];
      for (const t of data || []) {
        const { data: horse } = await supabase
          .from("horses")
          .select("name, breed, color, photo_url")
          .eq("id", t.horse_id)
          .single();

        const { data: seller } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", t.seller_id)
          .single();

        enriched.push({
          ...t,
          horse_name: horse?.name,
          horse_breed: horse?.breed,
          horse_color: horse?.color,
          horse_photo_url: (horse as any)?.photo_url,
          seller_name: seller?.full_name,
        });
      }
      setTransfers(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.size <= 10 * 1024 * 1024) setFile(f);
    else if (f) toast.error("Max. 10MB");
  };

  const confirmTransfer = async () => {
    if (!selectedTransfer || !password || !user) return;
    setProcessing(true);

    try {
      // Verify password via edge function (bcrypt)
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
        'hash-password',
        { body: { action: 'verify', password, hash: selectedTransfer.shared_password_hash } }
      );
      if (verifyError || !verifyResult?.match) {
        toast.error("Passwort stimmt nicht überein. Bitte mit dem Verkäufer abstimmen.");
        setProcessing(false);
        return;
      }

      // Upload buyer document
      if (file) {
        const filePath = `transfers/${selectedTransfer.id}/buyer/${file.name}`;
        await supabase.storage.from("horse-documents").upload(filePath, file);
        await supabase
          .from("horse_transfers")
          .update({ buyer_contract_url: filePath } as any)
          .eq("id", selectedTransfer.id);
      }

      // Complete transfer
      const { error } = await supabase
        .from("horse_transfers")
        .update({
          status: "completed",
          buyer_confirmed: true,
          buyer_confirmed_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          buyer_liability_accepted: true,
        } as any)
        .eq("id", selectedTransfer.id);

      if (error) throw error;

      // Transfer ownership
      await supabase
        .from("horses")
        .update({ owner_id: user.id } as any)
        .eq("id", selectedTransfer.horse_id);

      // Revoke old access grants
      await supabase
        .from("horse_partner_access")
        .update({ revoked_at: new Date().toISOString(), is_active: false } as any)
        .eq("horse_id", selectedTransfer.horse_id);

      // Audit log
      await logHorseAction(selectedTransfer.horse_id, "transfer_completed", {
        from: selectedTransfer.seller_id,
        to: user.id,
      });

      // Notify seller
      await supabase.from("notifications").insert({
        user_id: selectedTransfer.seller_id,
        title: "✅ Transfer abgeschlossen",
        message: `${selectedTransfer.horse_name || "Pferd"} wurde erfolgreich übertragen.`,
        type: "horse_transfer_completed",
      } as any);

      toast.success(`🎉 ${selectedTransfer.horse_name} ist jetzt in deinem HufManager!`);
      setSelectedTransfer(null);
      setBuyerStep(1);
      setPassword("");
      setFile(null);
      fetchPendingTransfers();
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Abschließen des Transfers");
    } finally {
      setProcessing(false);
    }
  };

  const declineTransfer = async () => {
    if (!selectedTransfer) return;
    await supabase
      .from("horse_transfers")
      .update({ status: "cancelled" } as any)
      .eq("id", selectedTransfer.id);

    await supabase.from("notifications").insert({
      user_id: selectedTransfer.seller_id,
      title: "❌ Transfer abgelehnt",
      message: `Der Transfer von ${selectedTransfer.horse_name || "Pferd"} wurde abgelehnt.`,
      type: "horse_transfer_declined",
    } as any);

    toast.info("Transfer abgelehnt");
    setSelectedTransfer(null);
    fetchPendingTransfers();
  };

  if (loading) return null;
  if (transfers.length === 0) return null;

  return (
    <>
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            🐴 Pferdeübernahme ausstehend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transfers.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
              <Avatar>
                <AvatarFallback>{t.horse_name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{t.horse_name || "Unbekannt"}</div>
                <div className="text-sm text-muted-foreground">
                  {t.horse_breed} · Von: {t.seller_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Angefragt: {format(new Date(t.initiated_at), "dd.MM.yyyy", { locale: de })}
                  {t.expires_at && ` · Läuft ab: ${format(new Date(t.expires_at), "dd.MM.yyyy", { locale: de })}`}
                </div>
              </div>
              <Button size="sm" onClick={() => { setSelectedTransfer(t); setBuyerStep(1); }}>
                Details
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Buyer confirmation modal */}
      <Dialog open={!!selectedTransfer} onOpenChange={(o) => !o && setSelectedTransfer(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pferdeübernahme bestätigen</DialogTitle>
          </DialogHeader>

          {buyerStep === 1 && selectedTransfer && (
            <div className="space-y-4">
              <Badge variant="outline">Schritt 1 von 3 — Pferd prüfen</Badge>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-2xl">{selectedTransfer.horse_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-lg">{selectedTransfer.horse_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedTransfer.horse_breed} · {selectedTransfer.horse_color}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Von: {selectedTransfer.seller_name}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button variant="outline" onClick={declineTransfer} className="flex-1">Ablehnen</Button>
                <Button onClick={() => setBuyerStep(2)} className="flex-1">
                  Pferd ist korrekt → Weiter
                </Button>
              </div>
            </div>
          )}

          {buyerStep === 2 && (
            <div className="space-y-4">
              <Badge variant="outline">Schritt 2 von 3 — Dokument hochladen</Badge>
              <p className="text-sm text-muted-foreground">
                Lade deinen Vertragsbeleg hoch (optional aber empfohlen).
              </p>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" id="buyer-doc" />
                <label htmlFor="buyer-doc" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">{file ? file.name : "Datei hochladen"}</p>
                  <p className="text-sm text-muted-foreground">PDF, JPG, PNG · max. 10MB</p>
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setBuyerStep(1)}>← Zurück</Button>
                <Button onClick={() => setBuyerStep(3)} className="flex-1">Weiter →</Button>
              </div>
            </div>
          )}

          {buyerStep === 3 && (
            <div className="space-y-4">
              <Badge variant="outline">Schritt 3 von 3 — Passwort bestätigen</Badge>
              <p className="text-sm text-muted-foreground">
                Gib das Passwort ein das ihr gemeinsam vereinbart habt.
              </p>
              <div>
                <Label>Gemeinsames Passwort</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort eingeben" className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={declineTransfer} className="gap-2">
                  <XCircle className="h-4 w-4" /> Ablehnen
                </Button>
                <Button onClick={confirmTransfer} disabled={!password || processing} className="flex-1 gap-2">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Transfer bestätigen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
