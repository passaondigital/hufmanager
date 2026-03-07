import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Crown,
  Download,
  FileText,
  ExternalLink,
  Info,
  Loader2,
  AlertTriangle,
  CreditCard,
  Calendar,
  Hash,
  PenTool,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CancellationSheet } from "./CancellationSheet";
import { ContractSignSheet } from "./ContractSignSheet";
import { LegalChangeBanner } from "./LegalChangeBanner";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  duo: "Duo",
  team: "Team",
};

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  pro: "bg-primary/10 text-primary",
  duo: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  team: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "Entwurf", className: "bg-muted text-muted-foreground" },
  sent: { label: "Versendet", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  paid: { label: "Bezahlt", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  overdue: { label: "Überfällig", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Storniert", className: "bg-muted text-muted-foreground" },
  active: { label: "Aktiv", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  expired: { label: "Abgelaufen", className: "bg-muted text-muted-foreground" },
};

const PAYMENT_LABELS: Record<string, string> = {
  bank_transfer: "Überweisung",
  copecart: "CopeCart",
  cash: "Barzahlung",
};

export function ManagementTab() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contract, setContract] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancellation, setShowCancellation] = useState(false);
  const [showSigning, setShowSigning] = useState(false);
  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);

    const [invoicesRes, contractRes, profileRes] = await Promise.all([
      supabase
        .from("admin_invoices")
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("admin_contracts")
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("readable_id, plan, plan_status, subscription_start, subscription_end")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (contractRes.data) setContract(contractRes.data);
    if (profileRes.data) setProfile(profileRes.data);
    setLoading(false);
  };

  const paymentMethod = contract?.payment_method || "copecart";
  const isCopecart = paymentMethod === "copecart";
  const currentPlan = contract?.plan || profile?.plan || "starter";
  const planStatus = profile?.plan_status || "active";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sektion A: Mein Abonnement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Mein Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Aktueller Plan</p>
              <Badge className={PLAN_COLORS[currentPlan] || "bg-muted"}>
                {PLAN_LABELS[currentPlan] || currentPlan}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={planStatus === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-800"}>
                {planStatus === "active" ? "Aktiv" : planStatus === "trial" ? "Testphase" : "Gesperrt"}
              </Badge>
            </div>
            {profile?.subscription_end && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Läuft bis</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(profile.subscription_end), "dd.MM.yyyy", { locale: de })}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Zahlungsart</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                {PAYMENT_LABELS[paymentMethod] || paymentMethod}
              </p>
            </div>
            {profile?.readable_id && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Provider-ID</p>
                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {profile.readable_id}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open("/#preise", "_blank")}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Plan ansehen
            </Button>
            {contract && !contract.cancellation_requested_at && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowCancellation(true)}
              >
                Kündigung beantragen
              </Button>
            )}
            {contract?.cancellation_requested_at && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Kündigung beantragt
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sektion B: Meine Rechnungen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Meine Rechnungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isCopecart && invoices.length === 0 ? (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                Ihr Abonnement wird über CopeCart abgewickelt.
                Ihre Rechnungen erhalten Sie direkt per E-Mail von CopeCart nach jeder Zahlung.
                <br />
                Fragen zur Abrechnung? → <a href="mailto:support@hufmanager.de" className="underline font-medium">support@hufmanager.de</a>
              </AlertDescription>
            </Alert>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Rechnungen vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr.</TableHead>
                    <TableHead>Zeitraum</TableHead>
                    <TableHead>Betrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const status = STATUS_LABELS[inv.status] || STATUS_LABELS.draft;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(inv.period_start), "MM/yyyy")} – {format(new Date(inv.period_end), "MM/yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {Number(inv.total).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                        </TableCell>
                        <TableCell>
                          <Badge className={status.className}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.pdf_url && (
                            <Button variant="ghost" size="sm" onClick={() => window.open(inv.pdf_url, "_blank")}>
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sektion C: Mein Vertrag */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Mein Vertrag
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contract ? (
            <div className="space-y-4">
              {contract.cancellation_requested_at && !contract.cancellation_effective_date && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-300">
                    Kündigung beantragt am {format(new Date(contract.cancellation_requested_at), "dd.MM.yyyy", { locale: de })}.
                    Ihr Zugang bleibt bis zum Laufzeitende aktiv.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Vertragsnummer</p>
                  <p className="text-sm font-mono font-medium">{contract.contract_number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <Badge className={PLAN_COLORS[contract.plan] || "bg-muted"}>
                    {PLAN_LABELS[contract.plan] || contract.plan}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Laufzeit</p>
                  <p className="text-sm">
                    {format(new Date(contract.period_start), "dd.MM.yyyy")}
                    {contract.period_end ? ` – ${format(new Date(contract.period_end), "dd.MM.yyyy")}` : " – unbefristet"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={(STATUS_LABELS[contract.status] || STATUS_LABELS.draft).className}>
                    {(STATUS_LABELS[contract.status] || STATUS_LABELS.draft).label}
                  </Badge>
                </div>
                {contract.provider_signed_at && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Abgeschlossen am</p>
                    <p className="text-sm">{format(new Date(contract.provider_signed_at), "dd.MM.yyyy", { locale: de })}</p>
                  </div>
                )}
              </div>
              {contract.pdf_url && (
                <>
                  <Separator />
                  <Button variant="outline" size="sm" onClick={() => window.open(contract.pdf_url, "_blank")}>
                    <Download className="h-4 w-4 mr-1.5" />
                    Vertrag als PDF herunterladen
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Ihr Vertrag wird nach Vertragsabschluss hier angezeigt.
                Bei Fragen: <a href="mailto:support@hufmanager.de" className="underline font-medium">support@hufmanager.de</a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Cancellation Sheet */}
      <CancellationSheet
        open={showCancellation}
        onOpenChange={setShowCancellation}
        contract={contract}
        currentPlan={currentPlan}
        onCancelled={fetchData}
      />
    </div>
  );
}
