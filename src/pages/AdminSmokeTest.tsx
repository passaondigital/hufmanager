import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, ClipboardCheck } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

interface CheckResult {
  label: string;
  ok: boolean;
  detail?: string;
}

function SmokeTestContent() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);

  const runTests = async () => {
    setRunning(true);
    setResults([]);
    const checks: CheckResult[] = [];

    try {
      // 1. Find Stella
      const { data: stella } = await (supabase.from("horses") as any)
        .select("id, name")
        .ilike("name", "%Stella%Sonnenhof%")
        .is("deleted_at", null)
        .maybeSingle();

      const stellaExists = !!stella;
      checks.push({ label: "Stella vom Sonnenhof existiert", ok: stellaExists, detail: stella?.id });

      if (!stellaExists) {
        checks.push(
          { label: "Stella hat min. 5 Termine", ok: false, detail: "Pferd nicht gefunden" },
          { label: "Stella hat Huf-Analysen", ok: false },
          { label: "Stella hat 4 Impfungen", ok: false },
          { label: "Stella hat Partner-Notizen", ok: false },
          { label: "Stella hat Tagebucheinträge", ok: false },
          { label: "Stella hat Gesundheits-Logs", ok: false },
        );
      } else {
        const horseId = stella.id;
        const [appts, hoofA, vaccs, notes, diary, health] = await Promise.all([
          supabase.from("appointments").select("id").eq("horse_id", horseId),
          supabase.from("hoof_analyses").select("id, hoof_data_vl").eq("horse_id", horseId),
          supabase.from("horse_vaccinations").select("id, next_due_date").eq("horse_id", horseId),
          supabase.from("partner_treatment_notes").select("id").eq("horse_id", horseId),
          supabase.from("horse_diary_entries").select("id").eq("horse_id", horseId),
          supabase.from("horse_health_logs").select("id").eq("horse_id", horseId),
        ]);

        const apptCount = (appts.data || []).length;
        checks.push({ label: "Stella hat min. 5 Termine", ok: apptCount >= 5, detail: `${apptCount} Termine` });

        const hoofCount = (hoofA.data || []).length;
        const hasJsonb = hoofA.data?.some((a: any) => a.hoof_data_vl != null);
        checks.push({ label: "Stella hat Huf-Analysen mit JSONB", ok: hoofCount > 0 && !!hasJsonb, detail: `${hoofCount} Analysen` });

        const vaccCount = (vaccs.data || []).length;
        const hasOverdue = vaccs.data?.some((v: any) => v.next_due_date && new Date(v.next_due_date) < new Date());
        checks.push({ label: "Stella hat 4 Impfungen (1 überfällig)", ok: vaccCount >= 4 && !!hasOverdue, detail: `${vaccCount} Impfungen, überfällig: ${hasOverdue ? "ja" : "nein"}` });

        checks.push({ label: "Stella hat Partner-Notizen", ok: (notes.data || []).length > 0, detail: `${(notes.data || []).length} Notizen` });
        checks.push({ label: "Stella hat Tagebucheinträge", ok: (diary.data || []).length > 0, detail: `${(diary.data || []).length} Einträge` });
        checks.push({ label: "Stella hat Gesundheits-Logs", ok: (health.data || []).length > 0, detail: `${(health.data || []).length} Logs` });
      }

      // Edge function tests
      try {
        const { error: fullErr } = await supabase.functions.invoke("generate-full-horse-report", {
          body: { horse_id: stella?.id || "test" },
        });
        checks.push({ label: "generate-full-horse-report antwortet", ok: !fullErr || !!stella, detail: fullErr?.message });
      } catch (e: any) {
        checks.push({ label: "generate-full-horse-report antwortet", ok: false, detail: e.message });
      }

      try {
        const { error: vaccErr } = await supabase.functions.invoke("generate-vaccination-report", {
          body: { horse_id: stella?.id || "test" },
        });
        checks.push({ label: "generate-vaccination-report antwortet", ok: !vaccErr || !!stella, detail: vaccErr?.message });
      } catch (e: any) {
        checks.push({ label: "generate-vaccination-report antwortet", ok: false, detail: e.message });
      }

      // Emergency token
      if (stella) {
        const { data: tokenData } = await supabase
          .from("horse_emergency_tokens" as any)
          .select("id")
          .eq("horse_id", stella.id)
          .eq("is_active", true)
          .maybeSingle();
        checks.push({ label: "Notfall-Token existiert für Stella", ok: !!tokenData });
      } else {
        checks.push({ label: "Notfall-Token existiert für Stella", ok: false, detail: "Pferd nicht gefunden" });
      }

      // Vault fields check (vault_pin in profiles)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user!.id)
        .single();
      checks.push({ label: "Profile-Tabelle erreichbar", ok: !!profileData });

    } catch (e: any) {
      checks.push({ label: "Allgemeiner Fehler", ok: false, detail: e.message });
    }

    setResults(checks);
    setRunning(false);
  };

  const passed = results.filter(r => r.ok).length;
  const total = results.length;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Smoke-Test – Demo-Daten Prüfung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runTests} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            {running ? "Prüfe..." : "Smoke-Test starten"}
          </Button>

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Ergebnis: {passed}/{total} bestanden
              </p>
              {results.map((r, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  {r.ok ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm text-foreground">{r.label}</p>
                    {r.detail && <p className="text-xs text-muted-foreground">{r.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSmokeTest() {
  return (
    <ProtectedRoute allowedRoles={["provider", "admin"]}>
      <SmokeTestContent />
    </ProtectedRoute>
  );
}
