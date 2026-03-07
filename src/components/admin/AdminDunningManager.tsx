import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle, Send, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const LEVEL_LABELS: Record<number, { label: string; className: string }> = {
  1: { label: "Zahlungserinnerung", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  2: { label: "1. Mahnung (5€)", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  3: { label: "2. Mahnung (10€)", className: "bg-destructive/10 text-destructive" },
};

export function AdminDunningManager() {
  const [dunningLogs, setDunningLogs] = useState<any[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [logsRes, invoicesRes] = await Promise.all([
      supabase.from("admin_dunning_log").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("admin_invoices").select("*").in("status", ["sent", "overdue"]).order("due_date", { ascending: true }),
    ]);
    if (logsRes.data) setDunningLogs(logsRes.data);
    if (invoicesRes.data) setOverdueInvoices(invoicesRes.data.filter(inv => inv.due_date && new Date(inv.due_date) < new Date()));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const markResolved = async (id: string) => {
    const { error } = await supabase.from("admin_dunning_log").update({ status: "resolved" }).eq("id", id);
    if (!error) { toast.success("Als geklärt markiert"); fetchData(); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Overdue invoices */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Überfällige Rechnungen ({overdueInvoices.length})
        </h3>
        {overdueInvoices.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">Keine überfälligen Rechnungen 🎉</p>
        ) : (
          <div className="space-y-2">
            {overdueInvoices.map(inv => {
              const daysOverdue = Math.ceil((Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Card key={inv.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-mono font-medium text-sm">{inv.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {inv.provider_name} · {Number(inv.total).toLocaleString("de-DE", { minimumFractionDigits: 2 })} € · fällig {format(new Date(inv.due_date), "dd.MM.yyyy")}
                      </p>
                    </div>
                    <Badge className={daysOverdue > 14 ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-800"}>
                      {daysOverdue} Tage überfällig
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dunning log */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Mahnverlauf</h3>
        {dunningLogs.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">Noch keine Mahnungen erstellt.</p>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rechnung</TableHead>
                  <TableHead>Stufe</TableHead>
                  <TableHead>Gebühr</TableHead>
                  <TableHead>Fällig</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dunningLogs.map(log => {
                  const level = LEVEL_LABELS[log.level] || LEVEL_LABELS[1];
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.invoice_id?.slice(0, 8)}…</TableCell>
                      <TableCell><Badge className={level.className}>{level.label}</Badge></TableCell>
                      <TableCell>{Number(log.fee || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</TableCell>
                      <TableCell>{format(new Date(log.due_date), "dd.MM.yyyy")}</TableCell>
                      <TableCell>
                        <Badge className={log.status === "resolved" ? "bg-green-100 text-green-800" : log.status === "sent" ? "bg-blue-100 text-blue-800" : "bg-muted"}>
                          {log.status === "resolved" ? "Geklärt" : log.status === "sent" ? "Gesendet" : "Ausstehend"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.status !== "resolved" && (
                          <Button variant="ghost" size="sm" onClick={() => markResolved(log.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Geklärt
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
      </div>
    </div>
  );
}
