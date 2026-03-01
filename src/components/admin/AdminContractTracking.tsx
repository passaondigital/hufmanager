import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Shield, CheckCircle, XCircle, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { isDemoEmail } from "@/lib/demo-accounts";

interface ProviderContract {
  provider_id: string;
  email: string | null;
  full_name: string | null;
  avv_signed_at: string | null;
  avv_version: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
}

export function AdminContractTracking() {
  const [data, setData] = useState<ProviderContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get all providers
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "provider");
      const ids = roles?.map(r => r.user_id) || [];
      if (ids.length === 0) { setData([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids)
        .is("deleted_at", null);

      // Get contracts
      const { data: contracts } = await supabase
        .from("provider_contracts")
        .select("provider_id, avv_signed_at, avv_version, terms_accepted_at, terms_version, privacy_accepted_at");

      const contractMap = new Map((contracts || []).map(c => [c.provider_id, c]));

      const merged: ProviderContract[] = (profiles || [])
        .filter(p => !isDemoEmail(p.email))
        .map(p => {
          const c = contractMap.get(p.id);
          return {
            provider_id: p.id,
            email: p.email,
            full_name: p.full_name,
            avv_signed_at: c?.avv_signed_at || null,
            avv_version: c?.avv_version || null,
            terms_accepted_at: c?.terms_accepted_at || null,
            privacy_accepted_at: c?.privacy_accepted_at || null,
          };
        });

      setData(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = data;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.email?.toLowerCase().includes(s) || p.full_name?.toLowerCase().includes(s));
    }
    if (showMissing) {
      list = list.filter(p => !p.avv_signed_at);
    }
    return list;
  }, [data, search, showMissing]);

  const stats = useMemo(() => ({
    total: data.length,
    avvSigned: data.filter(p => p.avv_signed_at).length,
    termsSigned: data.filter(p => p.terms_accepted_at).length,
    privacySigned: data.filter(p => p.privacy_accepted_at).length,
  }), [data]);

  const StatusIcon = ({ date }: { date: string | null }) =>
    date ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          AVV & Vertragsübersicht
        </h2>
        <p className="text-sm text-muted-foreground">Compliance-Status aller Provider (Demo ausgeschlossen)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Provider gesamt</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-500">{stats.avvSigned}</p>
          <p className="text-xs text-muted-foreground">AVV unterschrieben</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-500">{stats.total - stats.avvSigned}</p>
          <p className="text-xs text-muted-foreground">AVV ausstehend</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{stats.termsSigned}</p>
          <p className="text-xs text-muted-foreground">AGB akzeptiert</p>
        </Card>
      </div>

      {stats.total - stats.avvSigned > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{stats.total - stats.avvSigned} Provider haben noch keinen AVV unterschrieben. Diese müssen persönlich kontaktiert werden.</span>
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

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead className="text-center">AVV</TableHead>
                <TableHead className="text-center">AGB</TableHead>
                <TableHead className="text-center">Datenschutz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Keine Provider gefunden</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.provider_id}>
                  <TableCell className="font-medium">{p.full_name || "–"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <StatusIcon date={p.avv_signed_at} />
                      {p.avv_signed_at && <span className="text-[10px] text-muted-foreground">{format(parseISO(p.avv_signed_at), "dd.MM.yy")}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <StatusIcon date={p.terms_accepted_at} />
                      {p.terms_accepted_at && <span className="text-[10px] text-muted-foreground">{format(parseISO(p.terms_accepted_at), "dd.MM.yy")}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <StatusIcon date={p.privacy_accepted_at} />
                      {p.privacy_accepted_at && <span className="text-[10px] text-muted-foreground">{format(parseISO(p.privacy_accepted_at), "dd.MM.yy")}</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
