import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logHorseAction } from "@/utils/auditLog";
import { notifyHorseStakeholders } from "@/utils/notifyHorseStakeholders";
import { toast } from "sonner";

interface Props {
  horseId: string;
  horseName: string;
  reportType: "stolen" | "deceased";
  onComplete: () => void;
  onCancel: () => void;
}

export function HorseStatusReport({ horseId, horseName, reportType, onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const [incidentDate, setIncidentDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [authorityName, setAuthorityName] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Deceased-specific
  const [causeOfDeath, setCauseOfDeath] = useState("");
  const [vetName, setVetName] = useState("");

  const isStolen = reportType === "stolen";
  const title = isStolen ? "🚨 Diebstahl melden" : "💀 Tod melden";
  const newStatus = isStolen ? "stolen" : "deceased";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.size <= 10 * 1024 * 1024) setFile(f);
    else if (f) toast.error("Max. 10MB");
  };

  const submit = async () => {
    if (!user || !incidentDate || !confirmed) return;
    setSubmitting(true);

    try {
      // Upload document
      let documentUrls: string[] = [];
      if (file) {
        const path = `status-reports/${horseId}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("horse-documents").upload(path, file);
        if (!uploadErr) documentUrls = [path];
      }

      // Create status report
      const { error } = await supabase
        .from("horse_status_reports")
        .insert({
          horse_id: horseId,
          reported_by: user.id,
          report_type: isStolen ? "stolen" : "deceased",
          incident_date: incidentDate,
          incident_location: isStolen ? location : undefined,
          description: isStolen ? description : causeOfDeath || description,
          authority_name: authorityName || null,
          authority_case_number: caseNumber || null,
          authority_notified: !!authorityName,
          document_urls: documentUrls.length > 0 ? documentUrls : null,
        } as any);

      if (error) throw error;

      // Update horse status
      await supabase
        .from("horses")
        .update({
          horse_status: newStatus,
          status_changed_at: new Date().toISOString(),
          status_reason: isStolen ? `Als gestohlen gemeldet am ${incidentDate}` : `Verstorben am ${incidentDate}`,
          status_reported_at: new Date().toISOString(),
        } as any)
        .eq("id", horseId);

      // Audit
      await logHorseAction(horseId, "status_changed", {
        new_status: newStatus,
        report_type: reportType,
        incident_date: incidentDate,
      });

      // Notify admin
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: isStolen ? "🚨 Diebstahl gemeldet" : "🕊️ Pferd verstorben",
            message: `${horseName}: ${isStolen ? "Als gestohlen gemeldet" : "Als verstorben gemeldet"}`,
            type: isStolen ? "horse_status_stolen" : "horse_status_deceased",
            link: isStolen ? "/mission-control" : null,
          } as any);
        }
      }

      toast.success("Meldung erfolgreich abgesendet");
      onComplete();
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Absenden der Meldung");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onCancel}><ArrowLeft className="h-4 w-4" /></Button>
        <h3 className="font-semibold">{title}</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label>{isStolen ? "Datum des Vorfalls *" : "Todesdatum *"}</Label>
          <Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className="mt-1" />
        </div>

        {isStolen && (
          <>
            <div>
              <Label>Ort des Vorfalls *</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Wo wurde das Pferd zuletzt gesehen?" className="mt-1" />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Umstände des Diebstahls..." className="mt-1" rows={3} />
            </div>
          </>
        )}

        {!isStolen && (
          <>
            <div>
              <Label>Todesursache (optional)</Label>
              <Input value={causeOfDeath} onChange={(e) => setCauseOfDeath(e.target.value)} placeholder="Falls bekannt" className="mt-1" />
            </div>
            <div>
              <Label>Tierarzt (optional)</Label>
              <Input value={vetName} onChange={(e) => setVetName(e.target.value)} placeholder="Name des Tierarztes" className="mt-1" />
            </div>
          </>
        )}

        {/* Document upload */}
        <div>
          <Label>Dokumente hochladen</Label>
          <p className="text-xs text-muted-foreground mb-2">
            {isStolen ? "Polizeianzeige, Fotos" : "Totenschein, Tierarztbericht"}
          </p>
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" id="status-report-doc" />
            <label htmlFor="status-report-doc" className="cursor-pointer">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm">{file ? file.name : "Datei wählen"}</p>
            </label>
          </div>
        </div>

        {/* Authority section */}
        <div>
          <Label>Zuständige Behörde</Label>
          <Input value={authorityName} onChange={(e) => setAuthorityName(e.target.value)} placeholder="z.B. Polizei Aschaffenburg" className="mt-1" />
        </div>
        <div>
          <Label>Aktenzeichen</Label>
          <Input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} placeholder="Falls vorhanden" className="mt-1" />
        </div>

        {/* Privacy notice */}
        <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">ℹ️ Datenschutzhinweis:</p>
          <p className="text-muted-foreground">
            HufManager gibt Daten über dieses Pferd nur mit richterlichem Beschluss an Behörden weiter.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox id="confirm-report" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
          <label htmlFor="confirm-report" className="text-sm cursor-pointer">
            Ich bestätige die Meldung
          </label>
        </div>
      </div>

      <Button onClick={submit} disabled={!confirmed || !incidentDate || submitting} className="w-full">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Meldung absenden
      </Button>
    </div>
  );
}
