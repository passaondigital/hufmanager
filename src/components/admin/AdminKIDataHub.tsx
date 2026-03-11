import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Brain, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AgentDataRow {
  pid: string | null;
  kid: string | null;
  eqid: string | null;
  profi_name: string | null;
  kunden_name: string | null;
  kunden_telefon: string | null;
  pferdename: string | null;
  stall_name: string | null;
  gps_daten: string | null;
  termin_datum: string | null;
  termin_zeit: string | null;
}

export function AdminKIDataHub() {
  const [data, setData] = useState<AgentDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .rpc("get_agent_data_hub" as any);

    if (!error && rows) {
      const sorted = (rows as unknown as AgentDataRow[]).sort((a, b) => {
        if (!a.termin_datum) return 1;
        if (!b.termin_datum) return -1;
        return b.termin_datum.localeCompare(a.termin_datum);
      });
      setData(sorted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const hasMissingId = (row: AgentDataRow) =>
    !row.pid || !row.kid || !row.eqid;

  const filtered = data.filter((row) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      row.pferdename?.toLowerCase().includes(s) ||
      row.kunden_name?.toLowerCase().includes(s) ||
      row.profi_name?.toLowerCase().includes(s) ||
      row.pid?.toLowerCase().includes(s) ||
      row.kid?.toLowerCase().includes(s) ||
      row.eqid?.toLowerCase().includes(s)
    );
  });

  const missingCount = data.filter(hasMissingId).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">KI-Daten-Hub</h2>
            <p className="text-sm text-muted-foreground">
              Datenbasis für den Huufi-Agenten — {data.length} Einträge
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Stats */}
      {missingCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium text-destructive">
            {missingCount} Zeile{missingCount !== 1 ? "n" : ""} mit fehlenden IDs — bitte nachpflegen
          </span>
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="Suche nach Name, Pferd, PID, KID, EQID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">PID</TableHead>
                <TableHead className="whitespace-nowrap">KID</TableHead>
                <TableHead className="whitespace-nowrap">EQID</TableHead>
                <TableHead className="whitespace-nowrap">Profi</TableHead>
                <TableHead className="whitespace-nowrap">Kunde</TableHead>
                <TableHead className="whitespace-nowrap">Telefon</TableHead>
                <TableHead className="whitespace-nowrap">Pferd</TableHead>
                <TableHead className="whitespace-nowrap">Stall</TableHead>
                <TableHead className="whitespace-nowrap">GPS</TableHead>
                <TableHead className="whitespace-nowrap">Termin</TableHead>
                <TableHead className="whitespace-nowrap">Uhrzeit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    Keine Daten gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row, i) => {
                  const missing = hasMissingId(row);
                  return (
                    <TableRow
                      key={i}
                      className={missing ? "bg-destructive/10 hover:bg-destructive/15" : ""}
                    >
                      <TableCell>
                        {row.pid || <Badge variant="destructive" className="text-xs">fehlt</Badge>}
                      </TableCell>
                      <TableCell>
                        {row.kid || <Badge variant="destructive" className="text-xs">fehlt</Badge>}
                      </TableCell>
                      <TableCell>
                        {row.eqid || <Badge variant="destructive" className="text-xs">fehlt</Badge>}
                      </TableCell>
                      <TableCell>{row.profi_name || "—"}</TableCell>
                      <TableCell>{row.kunden_name || "—"}</TableCell>
                      <TableCell>{row.kunden_telefon || "—"}</TableCell>
                      <TableCell className="font-medium">{row.pferdename || "—"}</TableCell>
                      <TableCell>{row.stall_name || "—"}</TableCell>
                      <TableCell className="text-xs">{row.gps_daten || "—"}</TableCell>
                      <TableCell>{row.termin_datum || "—"}</TableCell>
                      <TableCell>{row.termin_zeit || "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
