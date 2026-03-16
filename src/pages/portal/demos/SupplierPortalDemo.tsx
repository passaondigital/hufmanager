import { useState } from "react";
import { Package, LayoutDashboard, ShoppingCart, Truck, Warehouse, RotateCcw, Users, Eye, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { PortalDemoShell } from "./PortalDemoShell";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "bestellungen", label: "Bestellungen", icon: ShoppingCart },
  { id: "fulfillment", label: "Fulfillment", icon: Truck },
  { id: "lager", label: "Lagerbestand", icon: Warehouse },
  { id: "retouren", label: "Retouren", icon: RotateCcw },
  { id: "nutzer", label: "Nutzer", icon: Users },
];

const BESTELLUNGEN = [
  { id: "ORD-2401", kunde: "Stefan Bergmann", artikel: "Duplo Composite Set", menge: 12, summe: "167,40 €", datum: "15.03.2025", status: "neu" },
  { id: "ORD-2402", kunde: "Maria Klein", artikel: "Vettec Equi-Pak CS (3er)", menge: 3, summe: "127,50 €", datum: "14.03.2025", status: "in_bearbeitung" },
  { id: "ORD-2403", kunde: "Jürgen Wolff", artikel: "Mustad Nägel E4 Slim (10kg)", menge: 1, summe: "89,00 €", datum: "13.03.2025", status: "versendet" },
  { id: "ORD-2404", kunde: "Heike Roth", artikel: "Effol Hufteer + Huf-Öl Set", menge: 5, summe: "78,50 €", datum: "12.03.2025", status: "versendet" },
  { id: "ORD-2405", kunde: "Andreas Bauer", artikel: "Werkzeug-Set Premium", menge: 1, summe: "349,00 €", datum: "11.03.2025", status: "zugestellt" },
  { id: "ORD-2406", kunde: "Tanja Schulz", artikel: "Duplo Composite Gr.2 (50er)", menge: 50, summe: "745,00 €", datum: "10.03.2025", status: "zugestellt" },
];

const LAGER = [
  { sku: "DUP-C0", name: "Duplo Composite Gr. 0", bestand: 1250, mindest: 200, eingang: "18.03.2025" },
  { sku: "DUP-C1", name: "Duplo Composite Gr. 1", bestand: 980, mindest: 200, eingang: "–" },
  { sku: "DUP-C2", name: "Duplo Composite Gr. 2", bestand: 45, mindest: 200, eingang: "16.03.2025" },
  { sku: "VET-EP", name: "Vettec Equi-Pak CS", bestand: 340, mindest: 100, eingang: "–" },
  { sku: "MUS-E4", name: "Mustad Nägel E4 Slim", bestand: 520, mindest: 150, eingang: "–" },
  { sku: "EFF-HT", name: "Effol Hufteer 500ml", bestand: 2100, mindest: 300, eingang: "–" },
];

const MONTHLY = [
  { month: "Sep", bestellungen: 48, umsatz: 12400 }, { month: "Okt", bestellungen: 55, umsatz: 14800 },
  { month: "Nov", bestellungen: 62, umsatz: 16200 }, { month: "Dez", bestellungen: 44, umsatz: 11900 },
  { month: "Jan", bestellungen: 58, umsatz: 15600 }, { month: "Feb", bestellungen: 67, umsatz: 18300 },
];

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    neu: { label: "Neu", variant: "destructive" },
    in_bearbeitung: { label: "In Bearbeitung", variant: "secondary" },
    versendet: { label: "Versendet", variant: "outline" },
    zugestellt: { label: "Zugestellt", variant: "default" },
  };
  const cfg = map[s] || { label: s, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

export default function SupplierPortalDemo() {
  const [tab, setTab] = useState("dashboard");
  const [selectedOrder, setSelectedOrder] = useState<typeof BESTELLUNGEN[0] | null>(null);

  return (
    <PortalDemoShell title="Lieferanten-Portal" orgName="Reitsport-Profi GmbH" icon={Package} iconColor="purple-400" navItems={NAV} activeTab={tab} onTabChange={setTab}>
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-muted-foreground">Bestell- & Logistik-Übersicht</p></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Offene Bestellungen", value: "12", icon: ShoppingCart },
              { label: "Fulfillment-Rate", value: "96%", icon: Truck },
              { label: "Lagerbestand", value: "2.340", icon: Warehouse },
              { label: "Retouren", value: "3", icon: RotateCcw },
            ].map((s) => (
              <Card key={s.label}><CardContent className="pt-5"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div><s.icon className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
            ))}
          </div>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Bestellungen / Monat</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MONTHLY}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Bar dataKey="bestellungen" fill="#8b5cf6" radius={[4,4,0,0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </div>
      )}

      {tab === "bestellungen" && (
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">Bestellungen</h1><p className="text-sm text-muted-foreground">{BESTELLUNGEN.length} Bestellungen</p></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Bestell-Nr.</TableHead><TableHead>Kunde</TableHead><TableHead>Artikel</TableHead><TableHead>Menge</TableHead><TableHead>Summe</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {BESTELLUNGEN.map((b) => (
                <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOrder(b)}>
                  <TableCell className="font-mono text-xs">{b.id}</TableCell><TableCell className="font-medium">{b.kunde}</TableCell><TableCell>{b.artikel}</TableCell><TableCell>{b.menge}</TableCell><TableCell className="font-medium">{b.summe}</TableCell><TableCell>{statusBadge(b.status)}</TableCell><TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "fulfillment" && (
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">Fulfillment</h1><p className="text-sm text-muted-foreground">Versand & Zustellung</p></div>
          <div className="grid lg:grid-cols-3 gap-4">
            {[
              { label: "Ø Bearbeitungszeit", value: "1,2 Tage", icon: Clock },
              { label: "Pünktliche Lieferung", value: "96%", icon: CheckCircle },
              { label: "Offene Lieferungen", value: "4", icon: AlertCircle },
            ].map((m) => (
              <Card key={m.label}><CardContent className="pt-6 text-center"><m.icon className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-2xl font-bold">{m.value}</p><p className="text-sm text-muted-foreground">{m.label}</p></CardContent></Card>
            ))}
          </div>
          <Card><CardHeader><CardTitle className="text-base">Aktive Sendungen</CardTitle></CardHeader><CardContent>
            <div className="space-y-3">
              {BESTELLUNGEN.filter(b => b.status === "versendet").map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm border rounded-lg p-3">
                  <div><p className="font-medium">{b.id} – {b.kunde}</p><p className="text-xs text-muted-foreground">{b.artikel}</p></div>
                  <div className="text-right"><Badge variant="outline">Unterwegs</Badge><p className="text-xs text-muted-foreground mt-1">DHL: 12345678</p></div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </div>
      )}

      {tab === "lager" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Lagerbestand</h1><p className="text-sm text-muted-foreground">{LAGER.length} Artikel</p></div><Button>Wareneingang</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Artikel</TableHead><TableHead>Bestand</TableHead><TableHead>Mindestbestand</TableHead><TableHead>Status</TableHead><TableHead>Nächster Eingang</TableHead></TableRow></TableHeader><TableBody>
              {LAGER.map((l) => (
                <TableRow key={l.sku} className={l.bestand < l.mindest ? "bg-destructive/5" : ""}>
                  <TableCell className="font-mono text-xs">{l.sku}</TableCell><TableCell className="font-medium">{l.name}</TableCell><TableCell className={l.bestand < l.mindest ? "text-destructive font-bold" : ""}>{l.bestand}</TableCell><TableCell>{l.mindest}</TableCell>
                  <TableCell>{l.bestand < l.mindest ? <Badge variant="destructive">Kritisch</Badge> : <Badge variant="default">OK</Badge>}</TableCell>
                  <TableCell>{l.eingang}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "retouren" && (
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">Retouren</h1><p className="text-sm text-muted-foreground">3 offene Retouren</p></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Retour-Nr.</TableHead><TableHead>Kunde</TableHead><TableHead>Artikel</TableHead><TableHead>Grund</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {[
                { id: "RET-01", kunde: "Stefan Bergmann", artikel: "Duplo Composite Gr.1 (5x)", grund: "Falsche Größe", status: "offen" },
                { id: "RET-02", kunde: "Maria Klein", artikel: "Vettec Superfast", grund: "Beschädigt", status: "bearbeitet" },
                { id: "RET-03", kunde: "Andreas Bauer", artikel: "Werkzeug-Set Premium", grund: "Widerruf", status: "erstattet" },
              ].map((r) => (
                <TableRow key={r.id}><TableCell className="font-mono text-xs">{r.id}</TableCell><TableCell>{r.kunde}</TableCell><TableCell>{r.artikel}</TableCell><TableCell>{r.grund}</TableCell><TableCell><Badge variant={r.status === "offen" ? "destructive" : r.status === "bearbeitet" ? "secondary" : "default"}>{r.status}</Badge></TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "nutzer" && (
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">Nutzer</h1></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Rolle</TableHead><TableHead>E-Mail</TableHead></TableRow></TableHeader><TableBody>
              {[{ name: "Klaus Richter", rolle: "Admin", email: "klaus@reitsport-profi.de" }, { name: "Petra Weiß", rolle: "Lager", email: "petra@reitsport-profi.de" }].map((u) => (
                <TableRow key={u.email}><TableCell className="font-medium">{u.name}</TableCell><TableCell><Badge variant="outline">{u.rolle}</Badge></TableCell><TableCell className="text-muted-foreground">{u.email}</TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent><DialogHeader><DialogTitle>Bestellung {selectedOrder?.id}</DialogTitle><DialogDescription>{selectedOrder?.kunde}</DialogDescription></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Artikel:</span> <span className="font-medium">{selectedOrder.artikel}</span></div>
                <div><span className="text-muted-foreground">Menge:</span> <span className="font-medium">{selectedOrder.menge}</span></div>
                <div><span className="text-muted-foreground">Summe:</span> <span className="font-medium">{selectedOrder.summe}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(selectedOrder.status)}</div>
              </div>
              <div className="flex gap-2 pt-2"><Button size="sm">Versenden</Button><Button size="sm" variant="outline">Lieferschein</Button><Button size="sm" variant="outline">Stornieren</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalDemoShell>
  );
}
