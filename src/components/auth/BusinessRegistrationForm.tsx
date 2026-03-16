import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const BUSINESS_TYPES = [
  { value: "pension", label: "Pensionsstall" },
  { value: "school", label: "Reitschule / Schulbetrieb" },
  { value: "training", label: "Ausbildungsstall / Beritt" },
  { value: "breeding", label: "Zuchtgestüt" },
  { value: "club", label: "Reitverein" },
  { value: "therapy", label: "Therapiestall" },
  { value: "other", label: "Sonstiges" },
];

interface BusinessRegistrationFormProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function BusinessRegistrationForm({ onComplete, onSkip }: BusinessRegistrationFormProps) {
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [capacity, setCapacity] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = businessName.trim() && businessType && file;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setUploading(true);

    try {
      // Upload verification document
      let docUrl = "";
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/gewerbeschein-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("verification-docs")
          .upload(path, file);
        if (uploadError) throw uploadError;
        docUrl = path;
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          client_type: "business",
          business_name: businessName.trim(),
          business_type: businessType,
          business_address: { street, zip, city },
          business_capacity: capacity ? parseInt(capacity) : null,
          verification_document_url: docUrl,
          verification_status: "pending",
          verification_submitted_at: new Date().toISOString(),
          account_status: "pending_verification",
        } as any)
        .eq("id", user.id);

      if (error) throw error;

      // Notify admin
      await supabase.from("notifications").insert({
        user_id: user.id, // will be picked up by admin trigger
        type: "business_verification_submitted",
        title: "Neuer Gewerbe-Account",
        message: `${businessName} (${BUSINESS_TYPES.find(t => t.value === businessType)?.label}) hat einen Gewerbe-Account beantragt.`,
        data: {
          business_name: businessName,
          business_type: businessType,
          contact_name: contactName,
          contact_email: contactEmail,
          user_id: user.id,
        },
      } as any);

      setSubmitted(true);
      toast.success("Gewerbe-Account beantragt!");
    } catch (err: any) {
      console.error("Business registration error:", err);
      toast.error("Fehler beim Einreichen. Bitte versuche es erneut.");
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Antrag eingereicht!</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Wir prüfen deinen Nachweis und melden uns innerhalb von 24 Stunden per E-Mail.
          Du kannst dich einloggen und die App erkunden.
        </p>
        <Button onClick={onComplete} className="mt-4">
          Weiter zur App
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-md mx-auto">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Gewerbe-Account einrichten</h2>
        <p className="text-sm text-muted-foreground mt-1">Dein Nachweis wird manuell geprüft.</p>
      </div>

      {/* Business Data */}
      <div className="space-y-3">
        <div>
          <Label>Betriebsname *</Label>
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="z.B. Reiterhof Sonnenschein" />
        </div>
        <div>
          <Label>Betriebsart *</Label>
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Label>Straße</Label>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Musterstr. 1" />
          </div>
          <div>
            <Label>PLZ</Label>
            <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="40210" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Ort</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Düsseldorf" />
          </div>
          <div>
            <Label>Stallplätze</Label>
            <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="z.B. 25" />
          </div>
        </div>
      </div>

      {/* Verification Document */}
      <div className="space-y-2">
        <Label>Gewerbeschein / Vereinsregisterauszug *</Label>
        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
          {file ? (
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-foreground">{file.name}</span>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setFile(null)}>Entfernen</button>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm text-muted-foreground">PDF oder Foto hochladen</p>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Wird manuell geprüft. Meist innerhalb von 24 Stunden.</p>
      </div>

      {/* Contact Person */}
      <div className="space-y-3">
        <Label className="font-medium">Kontaktperson</Label>
        <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Name" />
        <div className="grid grid-cols-2 gap-2">
          <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="E-Mail" />
          <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Telefon" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onSkip}>
          Später
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={!canSubmit || uploading}>
          {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Account beantragen
        </Button>
      </div>
    </div>
  );
}
