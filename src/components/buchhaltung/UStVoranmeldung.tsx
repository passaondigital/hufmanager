import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info, AlertTriangle } from "lucide-react";
import { startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, format, subQuarters } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Period = "month" | "quarter";

const QUARTERS = ["Q1 (Jan–Mär)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Okt–Dez)"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function UStVoranmeldung() {
  const { user } = useAuth();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);

  const [year, setYear] = useState(String(currentYear));
  const [period, setPeriod] = useState<Period>("quarter");
  const [selectedQuarter, setSelectedQuarter] = useState(String(currentQuarter));
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));

  // Calculate date range
  const y = parseInt(year);
  let rangeStart: Date, rangeEnd: Date;
  if (period === "quarter") {
    const q = parseInt(selectedQuarter);
    rangeStart = new Date(y, q * 3, 1);
    rangeEnd = endOfMonth(new Date(y, q * 3 + 2, 1));
  } else {
    const m = parseInt(selectedMonth);
    rangeStart = new Date(y, m, 1);
    rangeEnd = endOfMonth(new Date(y, m, 1));
  }

  const startStr = format(rangeStart, "yyyy-MM-dd");
  const endStr = format(rangeEnd, "yyyy-MM-dd");

  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ["ust-invoices", user?.id, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("total_amount, issue_date, status")
        .eq("provider_id", user!.id)
        .gte("issue_date", startStr)
        .lte("issue_date", endStr)
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: businessSettings } = useQuery({
    queryKey: ["business-settings-ust", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_settings")
        .select("default_vat_rate, tax_country, vat_id, tax_number")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isKleinunternehmer = (businessSettings?.default_vat_rate ?? 0) === 0;

  // Group by tax rate
    const taxGroups = invoices.reduce((acc, inv) => {
      const rate = Number(businessSettings?.default_vat_rate || 19);
      const total = Number(inv.total_amount || 0);
      const net = rate > 0 ? total / (1 + rate / 100) : total;
      const tax = total - net;

    if (!acc[rate]) acc[rate] = { net: 0, tax: 0, gross: 0, count: 0 };
    acc[rate].net += net;
    acc[rate].tax += tax;
    acc[rate].gross += total;
    acc[rate].count += 1;
    return acc;
  }, {} as Record<number, { net: number; tax: number; gross: number; count: number }>);

  const totalNet = Object.values(taxGroups).reduce((s, g) => s + g.net, 0);
  const totalTax = Object.values(taxGroups).reduce((s, g) => s + g.tax, 0);
  const totalGross = Object.values(taxGroups).reduce((s, g) => s + g.gross, 0);

  const fmtCurrency = (v: number) =>
    v.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  const periodLabel = period === "quarter"
    ? `${QUARTERS[parseInt(selectedQuarter)]} ${year}`
    : `${MONTHS[parseInt(selectedMonth)]} ${year}`;

  if (invLoading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quarter">Quartal</SelectItem>
            <SelectItem value="month">Monat</SelectItem>
          </SelectContent>
        </Select>

        {period === "quarter" ? (
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUARTERS.map((q, i) => (
                <SelectItem key={i} value={String(i)}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kleinunternehmer Notice */}
      {isKleinunternehmer && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Kleinunternehmerregelung aktiv</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Gemäß § 19 UStG sind Sie von der USt befreit. Eine Voranmeldung ist in der Regel nicht erforderlich.
                  Die Übersicht zeigt trotzdem Ihre Umsätze für Ihre Unterlagen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>USt-Voranmeldung Zusammenfassung</CardTitle>
              <CardDescription>{periodLabel}</CardDescription>
            </div>
            {businessSettings?.vat_id && (
              <Badge variant="outline" className="text-xs">
                USt-IdNr: {businessSettings.vat_id}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Breakdown by tax rate */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Umsätze nach Steuersatz
            </h3>

            {Object.keys(taxGroups).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Keine Umsätze im gewählten Zeitraum.
              </p>
            ) : (
              <div className="space-y-2">
                {Object.entries(taxGroups)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([rate, group]) => (
                    <div key={rate} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/50 gap-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono">
                          {Number(rate)}%
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {group.count} Rechnung{group.count !== 1 ? "en" : ""}
                        </span>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Netto: </span>
                          <span className="font-medium text-foreground">{fmtCurrency(group.net)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">USt: </span>
                          <span className="font-semibold text-primary">{fmtCurrency(group.tax)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Totals */}
          {Object.keys(taxGroups).length > 0 && (
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gesamtumsatz (netto)</span>
                <span className="font-medium text-foreground">{fmtCurrency(totalNet)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gesamtumsatz (brutto)</span>
                <span className="font-medium text-foreground">{fmtCurrency(totalGross)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-bold text-foreground">USt-Zahllast (vorläufig)</span>
                <span className="font-bold text-xl text-primary">{fmtCurrency(totalTax)}</span>
              </div>
            </div>
          )}

          {/* Kennzahlen for Elster */}
          {Object.keys(taxGroups).length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Kennzahlen für ELSTER-Übertragung
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {taxGroups[19] && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KZ 81 (19% Umsätze)</span>
                    <span className="font-mono text-foreground">{fmtCurrency(taxGroups[19].net)}</span>
                  </div>
                )}
                {taxGroups[7] && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KZ 86 (7% Umsätze)</span>
                    <span className="font-mono text-foreground">{fmtCurrency(taxGroups[7].net)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KZ 83 (Zahllast)</span>
                  <span className="font-mono font-semibold text-foreground">{fmtCurrency(totalTax)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Legal notice */}
          <div className="flex gap-2 p-3 rounded-lg bg-muted text-muted-foreground text-xs">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Diese Zusammenfassung dient als Vorarbeit für Ihre USt-Voranmeldung.
              Sie basiert auf den erfassten Rechnungen und ersetzt keine steuerliche Beratung.
              Die endgültige Meldung erfolgt über ELSTER oder Ihren Steuerberater.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
