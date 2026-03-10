import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, CheckCircle, XCircle, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { isDemoEmail } from "@/lib/demo-accounts";

interface ContractRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avv_signed_at: string | null;
}

const StatusIcon = ({ date }: { date: string | null }) =>
  date ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />;

function ContractTable({ data, loading, search, showMissing }: { data: ContractRow[]; loading: boolean; search: string; showMissing: boolean }) {
  const filtered = useMemo(() => {
    let list = data;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.email?.toLowerCase().includes(s) || p.full_name?.toLowerCase().includes(s));
    }
    if (showMissing) list = list.filter(p => !p.avv_signed_at);
    return list;
  }, [data, search, showMissing]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead className="text-center">AVV</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Keine Einträge gefunden</TableCell></TableRow>
          ) : filtered.map(p => (
            <TableRow key={p.user_id}>
              <TableCell className="font-medium">{p.full_name || "–"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <StatusIcon date={p.avv_signed_at} />
                  {p.avv_signed_at && <span className="text-[10px] text-muted-foreground">{format(parseISO(p.avv_signed_at), "dd.MM.yy")}</span>}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function AdminContractTracking() {
  const [providers, setProviders] = useState<ContractRow[]>([]);
  const [partners, setPartners] = useState<ContractRow[]>([]);
  const [employees, setEmployees] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // --- Providers ---
      const { data: provRoles } = await supabase.from("user_roles").select("user_id").eq("role", "provider");
      const provIds = provRoles?.map(r => r.user_id) || [];
      let provRows: ContractRow[] = [];
      if (provIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, email, full_name").in("id", provIds).is("deleted_at", null);
        const { data: contracts } = await supabase.from("provider_contracts").select("provider_id, avv_signed_at, avv_version");
        const cMap = new Map((contracts || []).map(c => [c.provider_id, c]));
        provRows = (profiles || []).filter(p => !isDemoEmail(p.email)).map(p => ({
          user_id: p.id, email: p.email, full_name: p.full_name,
          avv_signed_at: cMap.get(p.id)?.avv_signed_at || null,
        }));
      }
      setProviders(provRows);

      // --- Partners ---
      const { data: partRoles } = await supabase.from("user_roles").select("user_id").eq("role", "partner");
      const partIds = partRoles?.map(r => r.user_id) || [];
      let partRows: ContractRow[] = [];
      if (partIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, email, full_name").in("id", partIds).is("deleted_at", null);
        const { data: contracts } = await supabase.from("partner_contracts" as any).select("partner_id, avv_signed_at") as any;
        const cMap = new Map((contracts?.data || contracts || []).map((c: any) => [c.partner_id, c]));
        partRows = (profiles || []).filter(p => !isDemoEmail(p.email)).map(p => ({
          user_id: p.id, email: p.email, full_name: p.full_name,
          avv_signed_at: (cMap.get(p.id) as any)?.avv_signed_at || null,
        }));
      }
      setPartners(partRows);

      // --- Employees ---
      const { data: empRoles } = await supabase.from("user_roles").select("user_id").eq("role", "employee");
      const empIds = empRoles?.map(r => r.user_id) || [];
      let empRows: ContractRow[] = [];
      if (empIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, email, full_name").in("id", empIds).is("deleted_at", null);
        const { data: contracts } = await supabase.from("employee_contracts" as any).select("employee_user_id, avv_signed_at") as any;
        const cMap = new Map((contracts?.data || contracts || []).map((c: any) => [c.employee_user_id, c]));
        empRows = (profiles || []).filter(p => !isDemoEmail(p.email)).map(p => ({
          user_id: p.id, email: p.email, full_name: p.full_name,
          avv_signed_at: (cMap.get(p.id) as any)?.avv_signed_at || null,
        }));
      }
      setEmployees(empRows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statsFor = (data: ContractRow[]) => ({
    total: data.length,
    signed: data.filter(p => p.avv_signed_at).length,
  });

  const pStats = statsFor(providers);
  const partStats = statsFor(partners);
  const empStats = statsFor(employees);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          AVV & Vertragsübersicht
        </h2>
        <p className="text-sm text-muted-foreground">Compliance-Status aller Nutzer (Demo ausgeschlossen)</p>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold">{pStats.total}</p>
          <p className="text-xs text-muted-foreground">Provider</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-500">{pStats.signed}</p>
          <p className="text-xs text-muted-foreground">Provider AVV ✓</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{partStats.total}</p>
          <p className="text-xs text-muted-foreground">Partner</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-500">{partStats.signed}</p>
          <p className="text-xs text-muted-foreground">Partner AVV ✓</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{empStats.total}</p>
          <p className="text-xs text-muted-foreground">Mitarbeiter</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-500">{empStats.signed}</p>
          <p className="text-xs text-muted-foreground">MA AVV ✓</p>
        </Card>
      </div>

      {(pStats.total - pStats.signed + partStats.total - partStats.signed + empStats.total - empStats.signed) > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{pStats.total - pStats.signed + partStats.total - partStats.signed + empStats.total - empStats.signed} Nutzer haben noch keinen AVV unterschrieben.</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={showMissing} onCheckedChange={setShowMissing} />
          <span className="text-sm text-muted-foreground">Nur ohne AVV</span>
        </div>
      </div>

      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">Provider ({pStats.total})</TabsTrigger>
          <TabsTrigger value="partners">Partner ({partStats.total})</TabsTrigger>
          <TabsTrigger value="employees">Mitarbeiter ({empStats.total})</TabsTrigger>
        </TabsList>
        <TabsContent value="providers" className="mt-4">
          <ContractTable data={providers} loading={loading} search={search} showMissing={showMissing} />
        </TabsContent>
        <TabsContent value="partners" className="mt-4">
          <ContractTable data={partners} loading={loading} search={search} showMissing={showMissing} />
        </TabsContent>
        <TabsContent value="employees" className="mt-4">
          <ContractTable data={employees} loading={loading} search={search} showMissing={showMissing} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
