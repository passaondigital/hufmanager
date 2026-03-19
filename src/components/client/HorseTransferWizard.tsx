import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Search, Upload, CheckCircle, HelpCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logHorseAction } from "@/utils/auditLog";
import { notifyHorseStakeholders } from "@/utils/notifyHorseStakeholders";
import { toast } from "sonner";

interface Props {
  horseId: string;
  horseName: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface BuyerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  readable_id: string | null;
}

export function HorseTransferWizard({ horseId, horseName, onComplete, onCancel }: Props) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [buyer, setBuyer] = useState<BuyerProfile | null>(null);
  const [searching, setSearching] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const searchBuyer = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const q = searchQuery.trim();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, readable_id")
        .or(`email.ilike.%${q}%,readable_id.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(5);

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Kein HufManager Account gefunden. Bitte den Käufer bitten sich kostenlos zu registrieren.");
        return;
      }
      // If single result, auto-select
      if (data.length === 1) {
        setBuyer(data[0]);
      } else {
        // Show first match for now, could be expanded to selection list
        setBuyer(data[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Fehler bei der Suche");
    } finally {
      setSearching(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 10MB)");
      return;
    }
    setFile(f);
  };

  const submitTransfer = async () => {
    if (!buyer || !password || password !== passwordConfirm || !liabilityAccepted) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      // Create transfer record
      // Hash password via edge function (bcrypt)
      const { data: hashResult, error: hashError } = await supabase.functions.invoke(
        'hash-password',
        { body: { action: 'hash', password } }
      );
      if (hashError || !hashResult?.hash) {
        toast.error("Fehler beim Verschlüsseln des Passworts");
        setSubmitting(false);
        return;
      }

      const { data: transfer, error: transferError } = await supabase
        .from("horse_transfers")
        .insert({
          horse_id: horseId,
          seller_id: user.id,
          buyer_email: buyer.email || "",
          buyer_kid: buyer.readable_id,
          buyer_id: buyer.id,
          shared_password_hash: hashResult.hash,
          status: "initiated",
          seller_confirmed: true,
          seller_confirmed_at: new Date().toISOString(),
          seller_liability_accepted: true,
        } as any)
        .select("id")
        .single();

      if (transferError) throw transferError;

      // Upload document if provided
      if (file && transfer) {
        const filePath = `transfers/${transfer.id}/seller/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("horse-documents")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          await supabase
            .from("horse_transfers")
            .update({ seller_contract_url: filePath } as any)
            .eq("id", transfer.id);
        }
      }

      // Update horse status
      await supabase
        .from("horses")
        .update({
          horse_status: "sold",
          status_changed_at: new Date().toISOString(),
          status_reason: `Transfer an ${buyer.full_name || buyer.email}`,
        } as any)
        .eq("id", horseId);

      // Audit log
      await logHorseAction(horseId, "transfer_initiated", {
        buyer_name: buyer.full_name,
        buyer_id: buyer.id,
      });

      // Notify buyer
      await supabase.from("notifications").insert({
        user_id: buyer.id,
        title: "🐴 Pferdeübernahme angefragt",
        message: `Dir wurde ${horseName} zur Übernahme angeboten. Öffne HufManager um den Transfer zu bestätigen.`,
        type: "horse_transfer_received",
        link: "/client-home",
      } as any);

      toast.success("Transfer eingeleitet!");
      setStep(4);
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Erstellen des Transfers");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1: Find buyer
  if (step === 1) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCancel}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <Badge variant="outline">Schritt 1 von 4</Badge>
            <h3 className="font-semibold mt-1">Wer ist der neue Besitzer?</h3>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>E-Mail oder #KID des Käufers</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="email@beispiel.de oder #KID-XXXXX"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchBuyer()}
              />
              <Button onClick={searchBuyer} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            ⚠️ Der Käufer muss einen aktiven HufManager Account haben.
          </p>

          {buyer && (
            <Card className="border-primary">
              <CardContent className="p-4 flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{buyer.full_name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{buyer.full_name || "Unbekannt"}</div>
                  <div className="text-sm text-muted-foreground">{buyer.email}</div>
                  {buyer.readable_id && (
                    <Badge variant="secondary" className="mt-1">{buyer.readable_id}</Badge>
                  )}
                </div>
                <CheckCircle className="h-5 w-5 text-primary" />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setStep(2)} disabled={!buyer}>Weiter →</Button>
        </div>
      </div>
    );
  }

  // Step 2: Shared password
  if (step === 2) {
    const passwordsMatch = password.length >= 6 && password === passwordConfirm;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <Badge variant="outline">Schritt 2 von 4</Badge>
            <h3 className="font-semibold mt-1">Gemeinsames Passwort vereinbaren</h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Vereinbart vorab ein Passwort das ihr beide kennt. Beide müssen dieses Passwort eingeben um den Transfer zu bestätigen.
        </p>

        <div className="space-y-3">
          <div>
            <Label>Dein Passwort-Anteil *</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 Zeichen" className="mt-1" />
          </div>
          <div>
            <Label>Passwort bestätigen *</Label>
            <Input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Passwort wiederholen" className="mt-1" />
          </div>
          {password && passwordConfirm && password !== passwordConfirm && (
            <p className="text-sm text-destructive">Passwörter stimmen nicht überein</p>
          )}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help">
                <HelpCircle className="h-4 w-4" />
                Warum ein gemeinsames Passwort?
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Sicherheitsmerkmal: Beide Parteien müssen aktiv zustimmen. HufManager speichert nur den verschlüsselten Hash — das Passwort selbst ist uns unbekannt.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep(1)}>← Zurück</Button>
          <Button onClick={() => setStep(3)} disabled={!passwordsMatch}>Weiter →</Button>
        </div>
      </div>
    );
  }

  // Step 3: Document upload
  if (step === 3) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <Badge variant="outline">Schritt 3 von 4</Badge>
            <h3 className="font-semibold mt-1">Kaufvertrag / Übergabeprotokoll</h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Lade deinen Kaufvertrag hoch. Der Käufer lädt ebenfalls seinen Vertragsbeleg hoch.
        </p>

        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
            id="transfer-doc-upload"
          />
          <label htmlFor="transfer-doc-upload" className="cursor-pointer">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">{file ? file.name : "Datei hochladen"}</p>
            <p className="text-sm text-muted-foreground">PDF, JPG, PNG · max. 10MB</p>
          </label>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm">
          <p className="font-medium mb-1">⚠️ Wichtiger Hinweis:</p>
          <p className="text-muted-foreground">
            HufManager stellt die technische Infrastruktur zur Verfügung. Wir prüfen keine Vertragsinhalte und übernehmen keine Haftung für den Eigentumsübergang. Die rechtliche Verantwortung liegt bei Verkäufer und Käufer.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="liability"
            checked={liabilityAccepted}
            onCheckedChange={(v) => setLiabilityAccepted(v === true)}
          />
          <label htmlFor="liability" className="text-sm cursor-pointer">
            Ich habe den Hinweis gelesen und akzeptiere ihn
          </label>
        </div>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep(2)}>← Zurück</Button>
          <Button onClick={submitTransfer} disabled={!liabilityAccepted || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Transfer einleiten →
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Confirmation
  return (
    <div className="space-y-4 text-center">
      <CheckCircle className="h-12 w-12 text-primary mx-auto" />
      <h3 className="font-semibold text-lg">Transfer eingeleitet!</h3>
      <p className="text-sm text-muted-foreground">Was passiert jetzt?</p>

      <div className="text-left space-y-3">
        {[
          { icon: "✉️", text: `${buyer?.full_name || "Käufer"} erhält eine Benachrichtigung` },
          { icon: "📄", text: "Der Käufer lädt seinen Vertragsbeleg hoch" },
          { icon: "🔑", text: "Der Käufer gibt das gemeinsame Passwort ein" },
          { icon: "✅", text: "Transfer wird abgeschlossen und Besitz übertragen" },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="text-lg">{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      <Badge variant="secondary">Status: Warte auf Käufer-Bestätigung</Badge>

      <p className="text-xs text-muted-foreground">
        Du kannst den Transfer jederzeit abbrechen solange der Käufer noch nicht bestätigt hat.
      </p>

      <Button onClick={onComplete} className="w-full">Zum Dashboard</Button>
    </div>
  );
}
