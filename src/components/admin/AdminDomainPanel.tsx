import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Users, Clock, Shield, Download, Search, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "✅ Aktiv", variant: "default" },
  pending: { label: "⏳ Ausstehend", variant: "secondary" },
  expired: { label: "❌ Abgelaufen", variant: "destructive" },
  transferred: { label: "↗️ Transferiert", variant: "outline" },
  cancelled: { label: "🚫 Storniert", variant: "destructive" },
};

export function AdminDomainPanel() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch customer domains
  const { data: domains, isLoading: domainsLoading, refetch: refetchDomains } = useQuery({
    queryKey: ["admin-customer-domains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_domains")
        .select("id, owner_id, domain_name, tld, status, registered_at, expires_at, auto_renew, ssl_status, dns_verified, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch waitlist
  const { data: waitlist, isLoading: waitlistLoading } = useQuery({
    queryKey: ["admin-domain-waitlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("domain_waitlist")
        .select("id, owner_id, owner_type, email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch domain products
  const { data: products } = useQuery({
    queryKey: ["admin-domain-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("domain_products")
        .select("id, tld, display_name, register_price_cents, renewal_price_cents, is_available, is_featured")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const activeDomains = domains?.filter(d => d.status === "active").length || 0;
  const pendingDomains = domains?.filter(d => d.status === "pending").length || 0;
  const waitlistCount = waitlist?.length || 0;

  // Next expiry
  const nextExpiry = domains
    ?.filter(d => d.status === "active" && d.expires_at)
    .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())[0];
  const daysUntilExpiry = nextExpiry?.expires_at
    ? Math.ceil((new Date(nextExpiry.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Filtered domains
  const filteredDomains = domains?.filter(d => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (search && !d.domain_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) || [];

  const exportWaitlistCSV = () => {
    if (!waitlist?.length) return;
    const header = "Email,Typ,Datum\n";
    const rows = waitlist.map(w =>
      `${w.email || ""},${w.owner_type},${w.created_at ? format(new Date(w.created_at), "dd.MM.yyyy") : ""}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `domain-waitlist-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Domain-Verwaltung
          </h2>
          <p className="text-muted-foreground mt-1">Domains, Warteliste & TLD-Preise</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchDomains()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Aktualisieren
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeDomains}</p>
                <p className="text-xs text-muted-foreground">Aktive Domains</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingDomains}</p>
                <p className="text-xs text-muted-foreground">Ausstehend</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{waitlistCount}</p>
                <p className="text-xs text-muted-foreground">Auf Warteliste</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{daysUntilExpiry ?? "–"}</p>
                <p className="text-xs text-muted-foreground">Nächster Ablauf (Tage)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="domains">
        <TabsList>
          <TabsTrigger value="domains">Domains ({domains?.length || 0})</TabsTrigger>
          <TabsTrigger value="waitlist">Warteliste ({waitlistCount})</TabsTrigger>
          <TabsTrigger value="pricing">TLD-Preise ({products?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Domains Tab */}
        <TabsContent value="domains" className="mt-4 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Domain suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {["all", "active", "pending", "expired"].map(s => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "Alle" : STATUS_BADGES[s]?.label || s}
                </Button>
              ))}
            </div>
          </div>

          {domainsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredDomains.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Noch keine Domains registriert</p>
                <p className="text-xs text-muted-foreground mt-1">Domains werden hier angezeigt sobald Provider welche kaufen.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Domain</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">TLD</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">SSL</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">DNS</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Läuft ab</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Auto-Renew</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDomains.map((d) => {
                    const badge = STATUS_BADGES[d.status] || { label: d.status, variant: "outline" as const };
                    return (
                      <tr key={d.id} className="hover:bg-muted/30">
                        <td className="p-3 font-mono text-foreground">{d.domain_name}</td>
                        <td className="p-3 text-muted-foreground">{d.tld}</td>
                        <td className="p-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="p-3">
                          {d.ssl_status === "active" ? "✅" : d.ssl_status === "pending" ? "⏳" : "❌"}
                        </td>
                        <td className="p-3">
                          {d.dns_verified ? "✅" : "⚠️"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {d.expires_at ? format(new Date(d.expires_at), "dd.MM.yyyy") : "–"}
                        </td>
                        <td className="p-3">{d.auto_renew ? "✅" : "❌"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Waitlist Tab */}
        <TabsContent value="waitlist" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportWaitlistCSV} disabled={!waitlist?.length}>
              <Download className="h-3.5 w-3.5" />
              CSV Export
            </Button>
          </div>

          {waitlistLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !waitlist?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Noch niemand auf der Warteliste</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">E-Mail</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Typ</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Angemeldet</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {waitlist.map((w, i) => (
                    <tr key={w.id} className="hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{i + 1}</td>
                      <td className="p-3 font-mono text-foreground">{w.email || "–"}</td>
                      <td className="p-3"><Badge variant="outline">{w.owner_type}</Badge></td>
                      <td className="p-3 text-muted-foreground">
                        {w.created_at ? format(new Date(w.created_at), "dd.MM.yyyy HH:mm", { locale: de }) : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">TLD-Preiskatalog</CardTitle>
              <CardDescription>Aktuelle Domain-Preise aus der Datenbank</CardDescription>
            </CardHeader>
            <CardContent>
              {products && products.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium text-muted-foreground">TLD</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Registrierung</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Verlängerung</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Featured</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="p-3 font-mono font-semibold text-foreground">{p.tld}</td>
                          <td className="p-3 text-foreground">{(p.register_price_cents / 100).toFixed(2)}€</td>
                          <td className="p-3 text-foreground">{(p.renewal_price_cents / 100).toFixed(2)}€</td>
                          <td className="p-3">{p.is_available ? <Badge>Verfügbar</Badge> : <Badge variant="secondary">Deaktiviert</Badge>}</td>
                          <td className="p-3">{p.is_featured ? "⭐" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Keine TLD-Produkte konfiguriert.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
