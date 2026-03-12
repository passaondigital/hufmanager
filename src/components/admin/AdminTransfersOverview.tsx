import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { RefreshCw, FileText, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Transfer {
  id: string;
  horse_id: string;
  seller_id: string;
  buyer_email: string;
  status: string;
  initiated_at: string;
  completed_at: string | null;
  seller_contract_url: string | null;
  buyer_contract_url: string | null;
  horse_name?: string;
  seller_name?: string;
  buyer_name?: string;
}

interface StatusReport {
  id: string;
  horse_id: string;
  reported_by: string;
  report_type: string;
  incident_date: string | null;
  report_status: string;
  authority_name: string | null;
  authority_case_number: string | null;
  court_order_received: boolean;
  created_at: string;
  horse_name?: string;
  reporter_name?: string;
}

const statusColors: Record<string, string> = {
  initiated: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-muted text-muted-foreground",
  disputed: "bg-destructive/10 text-destructive",
  pending_review: "bg-blue-100 text-blue-800",
};

const reportStatusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  investigating: "bg-blue-100 text-blue-800",
  closed: "bg-muted text-muted-foreground",
  recovered: "bg-green-100 text-green-800",
};

export function AdminTransfersOverview() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [reports, setReports] = useState<StatusReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch transfers
      const { data: transferData } = await supabase
        .from("horse_transfers")
        .select("id, horse_id, seller_id, buyer_email, status, initiated_at, completed_at, seller_contract_url, buyer_contract_url")
        .order("initiated_at", { ascending: false });

      // Enrich transfers
      const enrichedTransfers: Transfer[] = [];
      for (const t of transferData || []) {
        const { data: horse } = await supabase.from("horses").select("name").eq("id", t.horse_id).single();
        const { data: seller } = await supabase.from("profiles").select("full_name").eq("id", t.seller_id).single();
        enrichedTransfers.push({
          ...t,
          horse_name: horse?.name,
          seller_name: seller?.full_name,
          buyer_name: t.buyer_email,
        });
      }
      setTransfers(enrichedTransfers);

      // Fetch status reports
      const { data: reportData } = await supabase
        .from("horse_status_reports")
        .select("id, horse_id, reported_by, report_type, incident_date, report_status, authority_name, authority_case_number, court_order_received, created_at")
        .order("created_at", { ascending: false });

      const enrichedReports: StatusReport[] = [];
      for (const r of reportData || []) {
        const { data: horse } = await supabase.from("horses").select("name").eq("id", r.horse_id).single();
        const { data: reporter } = await supabase.from("profiles").select("full_name").eq("id", r.reported_by).single();
        enrichedReports.push({
          ...r,
          horse_name: horse?.name,
          reporter_name: reporter?.full_name,
        });
      }
      setReports(enrichedReports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCourtOrder = async (reportId: string) => {
    const { error } = await supabase
      .from("horse_status_reports")
      .update({
        court_order_received: true,
        court_order_date: new Date().toISOString().split("T")[0],
      } as any)
      .eq("id", reportId);

    if (error) {
      toast.error("Fehler");
      return;
    }
    toast.success("Gerichtlicher Beschluss registriert");
    fetchData();
  };

  const filteredTransfers = filter === "all"
    ? transfers
    : transfers.filter((t) => t.status === filter);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Transfers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" /> Pferdetransfers
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            {["all", "initiated", "completed", "cancelled", "disputed"].map((f) => (
              <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
                {f === "all" ? "Alle" : f === "initiated" ? "Offen" : f === "completed" ? "Abgeschlossen" : f === "cancelled" ? "Abgebrochen" : "Streitfall"}
              </Button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pferd</TableHead>
                  <TableHead>Verkäufer</TableHead>
                  <TableHead>Käufer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Dokumente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.horse_name || "?"}</TableCell>
                    <TableCell>{t.seller_name || "?"}</TableCell>
                    <TableCell>{t.buyer_name}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[t.status] || ""}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(t.initiated_at), "dd.MM.yyyy", { locale: de })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {t.seller_contract_url && <FileText className="h-4 w-4 text-primary" />}
                        {t.buyer_contract_url && <FileText className="h-4 w-4 text-green-600" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransfers.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Keine Transfers</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Status Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Statusmeldungen (Diebstahl / Tod / Vermisst)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pferd</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Melder</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Behörde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gerichtsbeschluss</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.horse_name || "?"}</TableCell>
                    <TableCell>
                      <Badge variant={r.report_type === "stolen" ? "destructive" : "secondary"}>
                        {r.report_type === "stolen" ? "🚨 Gestohlen" : r.report_type === "deceased" ? "💀 Verstorben" : "❓ Vermisst"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.reporter_name}</TableCell>
                    <TableCell className="text-sm">
                      {r.incident_date ? format(new Date(r.incident_date), "dd.MM.yyyy", { locale: de }) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {r.authority_name || "-"}
                        {r.authority_case_number && <div className="text-xs text-muted-foreground">Az: {r.authority_case_number}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={reportStatusColors[r.report_status] || ""}>{r.report_status}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.court_order_received ? (
                        <Badge className="bg-green-100 text-green-800">✅ Vorliegend</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleCourtOrder(r.id)}>
                          Beschluss registrieren
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {reports.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Keine Meldungen</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
