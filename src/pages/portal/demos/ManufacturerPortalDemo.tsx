import { useState } from "react";
import { Factory, LayoutDashboard, Package, TrendingUp, Store, BarChart3, Users, Eye, Star, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { PortalDemoShell } from "./PortalDemoShell";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "produkte", label: "Produkte", icon: Package },
  { id: "empfehlungen", label: "Empfehlungen", icon: Star },
  { id: "haendler", label: "Händlernetz", icon: Store },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "nutzer", label: "Nutzer", icon: Users },
];

const PRODUKTE = [
  { id: "DUP-001", name: "Duplo Composite Gr. 0", kat: "Kunststoffbeschlag", preis: "12,90 €", empfehlungen: 234, lager: 1250, trend: "+12%" },
  { id: "DUP-002", name: "Duplo Composite Gr. 1", kat: "Kunststoffbeschlag", preis: "13,90 €", empfehlungen: 198, lager: 980, trend: "+8%" },
  { id: "DUP-003", name: "Duplo Composite Gr. 2", kat: "Kunststoffbeschlag", preis: "14,90 €", empfehlungen: 312, lager: 1500, trend: "+15%" },
  { id: "DUP-004", name: "Duplo Composite Gr. 3", kat: "Kunststoffbeschlag", preis: "15,90 €", empfehlungen: 167, lager: 870, trend: "+5%" },
  { id: "VET-001", name: "Vettec Equi-Pak CS", kat: "Hufpolster", preis: "42,50 €", empfehlungen: 89, lager: 340, trend: "+22%" },
  { id: "VET-002", name: "Vettec Superfast", kat: "Hufkleber", preis: "38,90 €", empfehlungen: 145, lager: 520, trend: "+18%" },
  { id: "EFF-001", name: "Effol Hufteer", kat: "Hufpflege", preis: "14,50 €", empfehlungen: 67, lager: 2100, trend: "+3%" },
  { id: "EFF-002", name: "Effol Huf-Öl", kat: "Hufpflege", preis: "16,90 €", empfehlungen: 102, lager: 1800, trend: "+7%" },
];

const MONTHLY = [
  { month: "Sep", empfehlungen: 156, bestellungen: 89 }, { month: "Okt", empfehlungen: 178, bestellungen: 102 },
  { month: "Nov", empfehlungen: 203, bestellungen: 118 }, { month: "Dez", empfehlungen: 189, bestellungen: 95 },
  { month: "Jan", empfehlungen: 221, bestellungen: 134 }, { month: "Feb", empfehlungen: 245, bestellungen: 148 },
];

const HAENDLER = [
  { name: "Reitsport Müller", ort: "Hamburg", umsatz: "12.400 €", produkte: 18, status: "aktiv" },
  { name: "Hufbedarf24.de", ort: "Online", umsatz: "28.900 €", produkte: 24, status: "aktiv" },
  { name: "Pferde-Profi GmbH", ort: "München", umsatz: "8.700 €", produkte: 12, status: "aktiv" },
  { name: "Stallbedarf Schmidt", ort: "Hannover", umsatz: "5.200 €", produkte: 8, status: "inaktiv" },
  { name: "Equi-Store Berlin", ort: "Berlin", umsatz: "15.300 €", produkte: 20, status: "aktiv" },
];

export default function ManufacturerPortalDemo() {
  const [tab, setTab] = useState("dashboard");
  const [selectedProduct, setSelectedProduct] = useState<typeof PRODUKTE[0] | null>(null);

  return (
    <PortalDemoShell title="Hersteller-Portal" orgName="Duplo GmbH" icon={Factory} iconColor="orange-400" navItems={NAV} activeTab={tab} onTabChange={setTab}>
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-muted-foreground">Produktperformance & Marktüberblick</p></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Produkte", value: "48", icon: Package },
              { label: "Empfehlungen", value: "1.234", icon: Star },
              { label: "Aktive Händler", value: "89", icon: Store },
              { label: "Umsatz/Monat", value: "34.500 €", icon: TrendingUp },
            ].map((s) => (
              <Card key={s.label}><CardContent className="pt-5"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div><s.icon className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">Empfehlungen & Bestellungen</CardTitle></CardHeader><CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={MONTHLY}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Bar dataKey="empfehlungen" fill="#f97316" radius={[4,4,0,0]} /><Bar dataKey="bestellungen" fill="#3b82f6" radius={[4,4,0,0]} /></BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">Top-Produkte</CardTitle></CardHeader><CardContent>
              <div className="space-y-3">
                {PRODUKTE.slice(0, 5).sort((a,b) => b.empfehlungen - a.empfehlungen).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-muted-foreground font-medium">#{i+1}</span>
                    <div className="flex-1"><p className="font-medium">{p.name}</p></div>
                    <span className="text-muted-foreground">{p.empfehlungen} Empf.</span>
                    <Badge variant="outline" className="text-emerald-500">{p.trend}</Badge>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </div>
        </div>
      )}

      {tab === "produkte" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Produktkatalog</h1><p className="text-sm text-muted-foreground">{PRODUKTE.length} Produkte</p></div><Button>+ Produkt anlegen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow>
              <TableHead>Art.-Nr.</TableHead><TableHead>Name</TableHead><TableHead>Kategorie</TableHead><TableHead>Preis</TableHead><TableHead>Empfehlungen</TableHead><TableHead>Lager</TableHead><TableHead>Trend</TableHead><TableHead></TableHead>
            </TableRow></TableHeader><TableBody>
              {PRODUKTE.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedProduct(p)}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell><TableCell className="font-medium">{p.name}</TableCell><TableCell><Badge variant="outline">{p.kat}</Badge></TableCell><TableCell>{p.preis}</TableCell><TableCell>{p.empfehlungen}</TableCell><TableCell>{p.lager}</TableCell><TableCell><Badge variant="outline" className="text-emerald-500">{p.trend}</Badge></TableCell><TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "empfehlungen" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Empfehlungs-Analytics</h1><p className="text-sm text-muted-foreground">Welche Hufbearbeiter empfehlen Ihre Produkte</p></div>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Empfehlungen über Zeit</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={MONTHLY}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Line type="monotone" dataKey="empfehlungen" stroke="#f97316" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Top-Empfehler</CardTitle></CardHeader><CardContent>
            <div className="space-y-3">
              {["Stefan Bergmann (87 Empf.)", "Maria Klein (62 Empf.)", "Jürgen Wolff (54 Empf.)", "Heike Roth (48 Empf.)", "Andreas Bauer (41 Empf.)"].map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm"><div className="flex items-center gap-3"><span className="w-5 text-muted-foreground">#{i+1}</span><span>{e}</span></div><Button size="sm" variant="outline">Profil</Button></div>
              ))}
            </div>
          </CardContent></Card>
        </div>
      )}

      {tab === "haendler" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Händlernetz</h1><p className="text-sm text-muted-foreground">{HAENDLER.length} Händler</p></div><Button>+ Händler hinzufügen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Ort</TableHead><TableHead>Umsatz</TableHead><TableHead>Produkte</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {HAENDLER.map((h) => (
                <TableRow key={h.name}><TableCell className="font-medium">{h.name}</TableCell><TableCell>{h.ort}</TableCell><TableCell className="font-medium">{h.umsatz}</TableCell><TableCell>{h.produkte}</TableCell><TableCell><Badge variant={h.status === "aktiv" ? "default" : "secondary"}>{h.status}</Badge></TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-sm text-muted-foreground">Nutzungsstatistiken & Marktdaten</p></div>
          <div className="grid lg:grid-cols-3 gap-4">
            {[{ label: "Conversion Rate", value: "4,8%", sub: "Empfehlung → Kauf" }, { label: "Ø Bestellwert", value: "127 €", sub: "Pro Bestellung" }, { label: "Wiederkäufer", value: "68%", sub: "Innerhalb 6 Monate" }].map((m) => (
              <Card key={m.label}><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{m.value}</p><p className="text-sm text-muted-foreground mt-1">{m.label}</p><p className="text-xs text-muted-foreground">{m.sub}</p></CardContent></Card>
            ))}
          </div>
        </div>
      )}

      {tab === "nutzer" && (
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">Nutzer</h1></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Rolle</TableHead><TableHead>E-Mail</TableHead></TableRow></TableHeader><TableBody>
              {[{ name: "Anna Weber", rolle: "Admin", email: "anna@duplo.de" }, { name: "Max Braun", rolle: "Produktmanager", email: "max@duplo.de" }, { name: "Lisa Horn", rolle: "Vertrieb", email: "lisa@duplo.de" }].map((u) => (
                <TableRow key={u.email}><TableCell className="font-medium">{u.name}</TableCell><TableCell><Badge variant="outline">{u.rolle}</Badge></TableCell><TableCell className="text-muted-foreground">{u.email}</TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent><DialogHeader><DialogTitle>{selectedProduct?.name}</DialogTitle><DialogDescription>{selectedProduct?.kat} · {selectedProduct?.id}</DialogDescription></DialogHeader>
          {selectedProduct && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Preis:</span> <span className="font-medium">{selectedProduct.preis}</span></div>
                <div><span className="text-muted-foreground">Lagerbestand:</span> <span className="font-medium">{selectedProduct.lager}</span></div>
                <div><span className="text-muted-foreground">Empfehlungen:</span> <span className="font-medium">{selectedProduct.empfehlungen}</span></div>
                <div><span className="text-muted-foreground">Trend:</span> <Badge variant="outline" className="text-emerald-500">{selectedProduct.trend}</Badge></div>
              </div>
              <div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Bearbeiten</Button><Button size="sm" variant="outline">Statistiken</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalDemoShell>
  );
}
