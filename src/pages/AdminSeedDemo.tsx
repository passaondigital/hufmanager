import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Database, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StepStatus {
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
}

export default function AdminSeedDemo() {
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [running, setRunning] = useState(false);

  const updateStep = (idx: number, patch: Partial<StepStatus>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const run = async () => {
    setRunning(true);
    const initialSteps: StepStatus[] = [
      { label: "Pferd anlegen / aktualisieren", status: "pending" },
      { label: "6 Hufbearbeitungs-Termine", status: "pending" },
      { label: "6 Huf-Analysen", status: "pending" },
      { label: "4 Impfungen", status: "pending" },
      { label: "2 Entwurmungen", status: "pending" },
      { label: "3 Partner-Behandlungsnotizen", status: "pending" },
      { label: "3 Besitzer-Tagebucheinträge", status: "pending" },
      { label: "4 Gesundheits-Logs", status: "pending" },
    ];
    setSteps(initialSteps);

    try {
      // Get current user as provider + owner
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");
      const userId = user.id;

      // ── Step 0: Horse ──
      updateStep(0, { status: "running" });

      const horseData = {
        name: "Stella vom Sonnenhof",
        breed: "Hannoveraner",
        gender: "Stute",
        birth_year: 2017,
        color: "Dunkelbraun",
        height_cm: 168,
        weight_kg: 580,
        chip_number: "000000000000001",
        ueln: "DE 000000000001",
        passport_number: "DE-00000-S-00000001",
        studbook: "Demo-Verband",
        insurance_company: "Demo-Versicherung",
        insurance_type: ["OP-Versicherung", "Haftpflicht"],
        housing: "Offenstall",
        holding_type: "Privatpferd",
        usage: "Dressur",
        usage_type: "leisure" as const,
        contacts: {
          vet: { name: "Demo-Tierärztin", phone: "+49 000 0000004" },
          trainer: { name: "Demo-Trainerin", phone: "+49 000 0000005" },
          stable: { name: "Demo-Reitstall Sonnenhof", phone: "+49 000 0000006" },
          caretaker: { name: "Demo-Pflegerin", phone: "+49 000 0000007" },
        },
        owner_id: userId,
        horse_status: "active",
      };

      // Check if horse exists
      const { data: existing } = await supabase
        .from("horses")
        .select("id")
        .eq("name", "Stella vom Sonnenhof")
        .eq("owner_id", userId)
        .maybeSingle();

      let horseId: string;
      if (existing) {
        const { error } = await supabase.from("horses").update(horseData).eq("id", existing.id);
        if (error) throw error;
        horseId = existing.id;
        updateStep(0, { status: "done", detail: `Aktualisiert (${horseId.slice(0, 8)})` });
      } else {
        const { data: ins, error } = await supabase.from("horses").insert(horseData).select("id").single();
        if (error) throw error;
        horseId = ins.id;
        updateStep(0, { status: "done", detail: `Erstellt (${horseId.slice(0, 8)})` });
      }

      // Helper: date offset
      const ago = (months: number, days = 0) => {
        const d = new Date();
        d.setMonth(d.getMonth() - months);
        d.setDate(d.getDate() - days);
        return d.toISOString().split("T")[0];
      };

      // ── Step 1: 6 Appointments ──
      updateStep(1, { status: "running" });

      // Delete old demo appointments for this horse first
      await supabase.from("appointments").delete().eq("horse_id", horseId).eq("provider_id", userId).like("notes", "%Erstbefund%");

      const appointmentDefs = [
        { monthsAgo: 12, service_type: "Barhufbearbeitung", notes: "Erstbefund. Hufe in akzeptablem Zustand. Zehe vorne deutlich zu lang (86mm). Trachten VL niedriger als VR. Strahl links leicht weich. Empfehlung: Intervall 8 Wochen.", completion_notes: "Alle 4 Hufe bearbeitet. Zehe vorne von 86mm auf 82mm gekürzt. Trachten angeglichen. Strahl-Pflege empfohlen." },
        { monthsAgo: 10, service_type: "Barhufbearbeitung", notes: "Zweiter Termin. Zehe vorne 84mm (nachgewachsen von 82). Trachten besser balanciert. Strahl links immer noch weich.", completion_notes: "Zehe auf 80mm korrigiert. Trachten beidzeitig. Strahl-Behandlung mit Kupfersulfat empfohlen." },
        { monthsAgo: 8, service_type: "Barhufbearbeitung", notes: "Gute Entwicklung. Zehe vorne 82mm. Strahl deutlich verbessert. Hornqualität gut.", completion_notes: "Zehe auf 78mm. Trachten symmetrisch. Strahl gesund. Weiter so." },
        { monthsAgo: 6, service_type: "Barhufbearbeitung", notes: "Routine. Zehe 80mm. Alles stabil. Besitzerin berichtet gutes Laufbild.", completion_notes: "Zehe auf 77mm. Alle Hufe in gutem Zustand. Intervall beibehalten." },
        { monthsAgo: 4, service_type: "Barhufbearbeitung", notes: "Strahl links wieder leicht aufgeweicht nach nassem Herbst. Sonst unauffällig.", completion_notes: "Zehe auf 78mm. Strahl links behandelt. Empfehlung: Trocken stellen, Hufpflege-Öl." },
        { monthsAgo: 1, daysAgo: 5, service_type: "Barhufbearbeitung", notes: "Strahl wieder gesund. Hufbalance gut. Leichte Medial-Abweichung VL beobachten.", completion_notes: "Trachten beidzeitig gekürzt. Zehe vorne 78mm. Sohle fest. Nächstes Mal Trachtenbalance VL prüfen." },
      ];

      const appointmentIds: string[] = [];
      for (const def of appointmentDefs) {
        const date = ago(def.monthsAgo, def.daysAgo || 0);
        const { data: apt, error } = await supabase.from("appointments").insert({
          horse_id: horseId,
          provider_id: userId,
          client_id: userId,
          date,
          service_type: def.service_type,
          notes: def.notes,
          completion_notes: def.completion_notes,
          status: "completed",
          completed_at: date + "T14:00:00Z",
        }).select("id").single();
        if (error) throw error;
        appointmentIds.push(apt.id);
      }
      updateStep(1, { status: "done", detail: `${appointmentIds.length} Termine` });

      // ── Step 2: Hoof Analyses ──
      updateStep(2, { status: "running" });

      const hoofDefs = [
        { vl: { toe_length_mm: 86, heel_height_mm: 28, hoof_angle_degrees: 48, frog_quality: "soft", wall_quality: "good" }, vr: { toe_length_mm: 84, heel_height_mm: 32, hoof_angle_degrees: 50, frog_quality: "healthy", wall_quality: "good" } },
        { vl: { toe_length_mm: 80, heel_height_mm: 30, hoof_angle_degrees: 50, frog_quality: "soft", wall_quality: "good" }, vr: { toe_length_mm: 80, heel_height_mm: 31, hoof_angle_degrees: 51, frog_quality: "healthy", wall_quality: "good" } },
        { vl: { toe_length_mm: 78, heel_height_mm: 31, hoof_angle_degrees: 51, frog_quality: "healthy", wall_quality: "good" }, vr: { toe_length_mm: 78, heel_height_mm: 32, hoof_angle_degrees: 52, frog_quality: "healthy", wall_quality: "good" } },
        { vl: { toe_length_mm: 77, heel_height_mm: 32, hoof_angle_degrees: 52, frog_quality: "healthy", wall_quality: "good" }, vr: { toe_length_mm: 77, heel_height_mm: 32, hoof_angle_degrees: 52, frog_quality: "healthy", wall_quality: "good" } },
        { vl: { toe_length_mm: 78, heel_height_mm: 31, hoof_angle_degrees: 51, frog_quality: "soft", wall_quality: "good" }, vr: { toe_length_mm: 77, heel_height_mm: 32, hoof_angle_degrees: 52, frog_quality: "healthy", wall_quality: "good" } },
        { vl: { toe_length_mm: 78, heel_height_mm: 32, hoof_angle_degrees: 52, frog_quality: "healthy", wall_quality: "good" }, vr: { toe_length_mm: 78, heel_height_mm: 32, hoof_angle_degrees: 52, frog_quality: "healthy", wall_quality: "good" } },
      ];

      for (let i = 0; i < hoofDefs.length; i++) {
        const { error } = await supabase.from("hoof_analyses").insert({
          horse_id: horseId,
          provider_id: userId,
          appointment_id: appointmentIds[i],
          hoof_data_vl: hoofDefs[i].vl,
          hoof_data_vr: hoofDefs[i].vr,
          hoof_data_hl: hoofDefs[i].vl, // mirror for hind
          hoof_data_hr: hoofDefs[i].vr,
          created_at: ago(appointmentDefs[i].monthsAgo, appointmentDefs[i].daysAgo || 0) + "T14:30:00Z",
        });
        if (error) throw error;
      }
      updateStep(2, { status: "done", detail: "6 Analysen" });

      // ── Step 3: Vaccinations ──
      updateStep(3, { status: "running" });

      const vaccinations = [
        { vaccine_type: "Influenza", vaccine_name: "ProteqFlu-Te", vaccination_date: ago(5), next_due_date: ago(-7), batch_number: "DEMO-2025-4892", administered_by: "Demo-Tierärztin" },
        { vaccine_type: "Tetanus", vaccine_name: "ProteqFlu-Te", vaccination_date: ago(5), next_due_date: ago(-19), batch_number: "DEMO-2025-4892", administered_by: "Demo-Tierärztin" },
        { vaccine_type: "Herpes", vaccine_name: "Equip EHV", vaccination_date: ago(7), next_due_date: ago(-1), batch_number: "DEMO-2025-1122", administered_by: "Demo-Tierärztin" },
        { vaccine_type: "Influenza", vaccine_name: "ProteqFlu-Te", vaccination_date: ago(11), administered_by: "Demo-Tierärztin" },
      ];

      // next_due_date: negative months = future
      const futureDate = (monthsFromNow: number) => {
        const d = new Date();
        d.setMonth(d.getMonth() + monthsFromNow);
        return d.toISOString().split("T")[0];
      };

      const vaccData = [
        { ...vaccinations[0], horse_id: horseId, next_due_date: futureDate(7) },
        { ...vaccinations[1], horse_id: horseId, next_due_date: futureDate(19) },
        { ...vaccinations[2], horse_id: horseId, next_due_date: ago(1) }, // OVERDUE
        { vaccine_type: "Influenza", vaccine_name: "ProteqFlu-Te", vaccination_date: ago(11), administered_by: "Demo-Tierärztin", horse_id: horseId },
      ];

      const { error: vaccError } = await supabase.from("horse_vaccinations").insert(vaccData);
      if (vaccError) throw vaccError;
      updateStep(3, { status: "done", detail: "4 Impfungen" });

      // ── Step 4: Deworming ──
      updateStep(4, { status: "running" });

      const { error: dewormError } = await supabase.from("horse_deworming").insert([
        { horse_id: horseId, product_name: "Equest Pramox", active_substance: "Moxidectin + Praziquantel", deworming_date: ago(2), fecal_egg_count: 0, administered_by: "Demo-Tierärztin" },
        { horse_id: horseId, product_name: "Ivermectin", active_substance: "Ivermectin", deworming_date: ago(8), fecal_egg_count: 150, administered_by: "Demo-Tierärztin" },
      ]);
      if (dewormError) throw dewormError;
      updateStep(4, { status: "done", detail: "2 Entwurmungen" });

      // ── Step 5: Partner Treatment Notes ──
      updateStep(5, { status: "running" });

      const partnerNotes = [
        {
          horse_id: horseId,
          partner_id: userId,
          partner_type: "osteopath" as const,
          title: "Osteopathische Behandlung",
          treatment_date: ago(2),
          findings: "ISG-Blockade rechts. Atlas leicht rotiert. M. longissimus dorsi links verspannt. Schulter links eingeschränkt.",
          notes: "Mobilisation ISG, Atlas-Release, Faszientechnik Schulter, Stretching-Übungen gezeigt.",
          next_treatment: "3 Tage Schrittführen, dann langsam aufbauen. Kontrolle in 6 Wochen.",
          visible_to_pid: true,
          visible_to_kid: true,
          recommendation_for: [{ target_role: "hufpfleger", message: "Bitte Beckenstand beim nächsten Termin prüfen – ISG war rechts blockiert", due_date: null }],
        },
        {
          horse_id: horseId,
          partner_id: userId,
          partner_type: "osteopath" as const,
          title: "Kontrolle nach ISG-Behandlung",
          treatment_date: ago(0, 14),
          findings: "ISG rechts frei. Schulter links deutlich besser. Atlas o.B. Beckenstand jetzt symmetrisch.",
          notes: "Leichte Mobilisation zur Stabilisierung. Normales Training freigegeben.",
          next_treatment: "Normales Training. Nächste Kontrolle in 8 Wochen.",
          visible_to_pid: true,
          visible_to_kid: true,
          recommendation_for: [{ target_role: "hufpfleger", message: "Beckenstand jetzt symmetrisch – relevant für Hufbalance-Beurteilung", due_date: null }],
        },
        {
          horse_id: horseId,
          partner_id: userId,
          partner_type: "physiotherapeut" as const,
          title: "Rückenmuskulatur-Behandlung",
          treatment_date: ago(3),
          findings: "M. longissimus dorsi beidseits verspannt. Kruppe asymmetrisch belastet.",
          notes: "Lasertherapie (10min, 808nm), Massage, Dehnungsübungen demonstriert.",
          next_treatment: "Tägliches Karotten-Stretching. Cavaletti-Arbeit 2x pro Woche.",
          visible_to_pid: true,
          visible_to_kid: true,
        },
      ];

      const { error: ptnError } = await supabase.from("partner_treatment_notes").insert(partnerNotes);
      if (ptnError) throw ptnError;
      updateStep(5, { status: "done", detail: "3 Notizen" });

      // ── Step 6: Diary Entries ──
      updateStep(6, { status: "running" });

      const diaryEntries = [
        { horse_id: horseId, owner_id: userId, category: "Beobachtung", text: "Leichtes Lahmen vorne links – Stella lahmt seit gestern leicht vorne links. Boden war hart gefroren. Habe Kühlgamasche angelegt und beobachte weiter.", shared_with_provider: true, created_at: ago(0, 3) + "T10:00:00Z" },
        { horse_id: horseId, owner_id: userId, category: "Allgemein", text: "Sattel angepasst – Sattler war da, Kopfeisen links unterlegt. Stella läuft seither deutlich besser.", shared_with_provider: true, created_at: ago(0, 21) + "T15:00:00Z" },
        { horse_id: horseId, owner_id: userId, category: "Fütterung", text: "Futterwechsel auf Timothy-Heu – Umgestellt von Wiesenheu auf Timothy. Verträgt sie gut, kein Durchfall.", shared_with_provider: false, created_at: ago(2) + "T09:00:00Z" },
      ];

      const { error: diaryError } = await supabase.from("horse_diary_entries").insert(diaryEntries);
      if (diaryError) throw diaryError;
      updateStep(6, { status: "done", detail: "3 Einträge" });

      // ── Step 7: Health Logs ──
      updateStep(7, { status: "running" });

      const healthLogs = [
        { horse_id: horseId, owner_id: userId, date: ago(0, 7), wellbeing: 4, weight: 578, notes: "Fit und munter" },
        { horse_id: horseId, owner_id: userId, date: ago(1), wellbeing: 3, weight: 580, notes: "Etwas matt nach Kolik-Symptomatik, Entwarnung vom Tierarzt" },
        { horse_id: horseId, owner_id: userId, date: ago(3), wellbeing: 5, weight: 582, notes: "Top-Form" },
        { horse_id: horseId, owner_id: userId, date: ago(6), wellbeing: 4, weight: 576, notes: "Normal" },
      ];

      const { error: healthError } = await supabase.from("horse_health_logs").insert(healthLogs);
      if (healthError) throw healthError;
      updateStep(7, { status: "done", detail: "4 Logs" });

      toast.success("Demo-Pferd 'Stella vom Sonnenhof' komplett angelegt!");
    } catch (err: any) {
      console.error("Seed error:", err);
      toast.error("Fehler: " + (err.message || "Unbekannt"));
      setSteps((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "error", detail: err.message } : s))
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex items-start justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Demo-Daten Seed
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Erstellt das Demo-Pferd "Stella vom Sonnenhof" mit komplettem Datensatz für die Pferdeakte-Präsentation.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={run} disabled={running} className="w-full gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {running ? "Wird erstellt..." : "Demo-Pferd Stella erstellen"}
          </Button>

          {steps.length > 0 && (
            <div className="space-y-2 mt-4">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  {s.status === "pending" && <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />}
                  {s.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {s.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {s.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span className={s.status === "done" ? "text-muted-foreground" : "text-foreground"}>
                    {s.label}
                  </span>
                  {s.detail && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">{s.detail}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
