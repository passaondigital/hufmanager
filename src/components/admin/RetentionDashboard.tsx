import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, AlertTriangle, Trash2, Shield, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import { de } from "date-fns/locale";

interface RetentionRule {
  id: string;
  category: string;
  retention_days: number;
  action: string;
  description: string | null;
  target_table: string | null;
  target_date_column: string | null;
}

interface ExpiringRecord {
  id: string;
  category: string;
  table_name: string;
  record_id: string;
  record_label: string;
  date_value: string;
  expires_at: string;
  days_remaining: number;
  rule: RetentionRule;
}

export function RetentionDashboard() {
  const [rules, setRules] = useState<RetentionRule[]>([]);
  const [expiringRecords, setExpiringRecords] = useState<ExpiringRecord[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const { data, error } = await supabase
      .from("data_retention_rules")
      .select("*")
      .order("retention_days", { ascending: true });

    if (error) {
      toast.error("Fehler beim Laden der Aufbewahrungsregeln");
      return;
    }
    setRules(data || []);
    if (data && data.length > 0) {
      await scanForExpiringRecords(data);
    }
    setLoading(false);
  };

  const scanForExpiringRecords = async (rulesToScan: RetentionRule[]) => {
    setScanning(true);
    const records: ExpiringRecord[] = [];

    for (const rule of rulesToScan) {
      if (!rule.target_table || !rule.target_date_column) continue;

      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - rule.retention_days + 90); // Look 90 days ahead

        let query = supabase
          .from(rule.target_table as any)
          .select("id, created_at" as any)
          .limit(50);

        // For soft-deleted records, look for non-null deleted_at
        if (rule.target_date_column === "deleted_at") {
          query = supabase
            .from(rule.target_table as any)
            .select("id, deleted_at, full_name" as any)
            .not("deleted_at", "is", null)
            .limit(50);
        }

        const { data, error } = await query;
        if (error || !data) continue;

        for (const record of data as any[]) {
          const dateValue = record[rule.target_date_column];
          if (!dateValue) continue;

          const recordDate = new Date(dateValue);
          const expiresAt = addDays(recordDate, rule.retention_days);
          const daysRemaining = differenceInDays(expiresAt, new Date());

          // Only include records expiring within 90 days or already overdue
          if (daysRemaining <= 90) {
            records.push({
              id: `${rule.target_table}-${record.id}`,
              category: rule.category,
              table_name: rule.target_table,
              record_id: record.id,
              record_label: record.full_name || record.id?.substring(0, 8) || "–",
              date_value: dateValue,
              expires_at: expiresAt.toISOString(),
              days_remaining: daysRemaining,
              rule,
            });
          }
        }
      } catch {
        // Skip tables that don't exist or aren't accessible
      }
    }

    records.sort((a, b) => a.days_remaining - b.days_remaining);
    setExpiringRecords(records);
    setScanning(false);
  };

  const filteredRecords = expiringRecords.filter(r => {
    if (filter === "overdue") return r.days_remaining < 0;
    if (filter === "30days") return r.days_remaining >= 0 && r.days_remaining <= 30;
    if (filter === "90days") return r.days_remaining >= 0 && r.days_remaining <= 90;
    return true;
  });

  const overdueCount = expiringRecords.filter(r => r.days_remaining < 0).length;
  const within30 = expiringRecords.filter(r => r.days_remaining >= 0 && r.days_remaining <= 30).length;
  const within90 = expiringRecords.filter(r => r.days_remaining > 30 && r.days_remaining <= 90).length;

  const handleManualDelete = async (record: ExpiringRecord) => {
    try {
      if (record.rule.target_date_column === "deleted_at") {
        // Hard-delete soft-deleted records
        const { error } = await supabase
          .from(record.table_name as any)
          .delete()
          .eq("id", record.record_id);

        if (error) throw error;
      } else {
        // Soft-delete regular records
        const { error } = await supabase
          .from(record.table_name as any)
          .update({ deleted_at: new Date().toISOString() } as any)
          .eq("id", record.record_id);

        if (error) throw error;
      }

      setExpiringRecords(prev => prev.filter(r => r.id !== record.id));
      toast.success(`Datensatz aus "${record.category}" gelöscht`);
    } catch (err: any) {
      toast.error(`Fehler: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Aufbewahrungsfristen-Monitor
              </CardTitle>
              <CardDescription>
                Automatische Überwachung basierend auf dem Verarbeitungsverzeichnis (Art. 30 DSGVO)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => scanForExpiringRecords(rules)}
              disabled={scanning}
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Scan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* KPI Badges */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Badge
              variant={overdueCount > 0 ? "destructive" : "secondary"}
              className="cursor-pointer text-sm py-1 px-3"
              onClick={() => setFilter("overdue")}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {overdueCount} überfällig
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer text-sm py-1 px-3"
              onClick={() => setFilter("30days")}
            >
              <Clock className="h-3 w-3 mr-1" />
              {within30} in 30 Tagen
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer text-sm py-1 px-3"
              onClick={() => setFilter("90days")}
            >
              {within90} in 90 Tagen
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer text-sm py-1 px-3"
              onClick={() => setFilter("all")}
            >
              Alle ({expiringRecords.length})
            </Badge>
          </div>

          {/* Rules Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {rules.map(rule => (
              <div key={rule.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{rule.category}</p>
                <p className="text-muted-foreground text-xs">{rule.retention_days} Tage · {rule.action}</p>
              </div>
            ))}
          </div>

          {/* Records Table */}
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Keine Datensätze in diesem Zeitraum gefunden.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Tabelle</TableHead>
                    <TableHead>Datensatz</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Frist</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map(record => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.category}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{record.table_name}</TableCell>
                      <TableCell className="text-xs">{record.record_label}</TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(record.date_value), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(record.expires_at), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell>
                        {record.days_remaining < 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            {Math.abs(record.days_remaining)}d überfällig
                          </Badge>
                        ) : record.days_remaining <= 30 ? (
                          <Badge variant="outline" className="text-xs border-accent text-accent-foreground">
                            {record.days_remaining}d verbleibend
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {record.days_remaining}d verbleibend
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Datensatz endgültig löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                <strong>{record.category}</strong> — Datensatz "{record.record_label}" aus Tabelle <code>{record.table_name}</code> wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleManualDelete(record)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Endgültig löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
