import { useState } from "react";
import { Factory, LayoutDashboard, Package, TrendingUp, Store, BarChart3, Users, Eye, Star, ShoppingCart, Heart, MessageSquare, Link2, Globe, Briefcase, Plus, Search, Warehouse, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { PortalDemoShell } from "./PortalDemoShell";
import { PferdeaktenTab, ChatTab, HMConnectTab, NutzerTab, MitarbeiterTab, LandingpageTab } from "./shared/SharedPortalTabs";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "produkte", label: "Produkte", icon: Package },
  { id: "katalog", label: "Katalog", icon: ShoppingCart },
  { id: "lager", label: "Lagerbestand", icon: Warehouse },
  { id: "lieferanten", label: "Lieferanten", icon: Truck },
  { id: "empfehlungen", label: "Empfehlungen", icon: Star },
  { id: "haendler", label: "Händlernetz", icon: Store },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "pferdeakten", label: "Pferdeakten", icon: Heart },
  { id: "nachrichten", label: "Nachrichten", icon: MessageSquare },
  { id: "connect", label: "HM Connect", icon: Link2 },
  { id: "mitarbeiter", label: "Mitarbeiter", icon: Briefcase },
  { id: "nutzer", label: "Nutzer", icon: Users },
  { id: "landingpage", label: "Website", icon: Globe },
];

const PRODUKTE = [
  { id: "DEM-001", name: "Demo-Composite Gr. 0", kat: "Kunststoffbeschlag", preis: "12,90 €", empfehlungen: 234, lager: 1250, minBestand: 200, trend: "+12%", sku: "DC-0-001" },
  { id: "DEM-002", name: "Demo-Composite Gr. 1", kat: "Kunststoffbeschlag", preis: "13,90 €", empfehlungen: 198, lager: 980, minBestand: 150, trend: "+8%", sku: "DC-1-001" },
  { id: "DEM-003", name: "Demo-Composite Gr. 2", kat: "Kunststoffbeschlag", preis: "14,90 €", empfehlungen: 312, lager: 1500, minBestand: 200, trend: "+15%", sku: "DC-2-001" },
  { id: "DEM-004", name: "Demo-Hufpolster CS", kat: "Hufpolster", preis: "42,50 €", empfehlungen: 89, lager: 340, minBestand: 100, trend: "+22%", sku: "DHP-CS-001" },
  { id: "DEM-005", name: "Demo-Schnellkleber", kat: "Hufkleber", preis: "38,90 €", empfehlungen: 145, lager: 520, minBestand: 100, trend: "+18%", sku: "DSK-001" },
  { id: "DEM-006", name: "Demo-Hufteer", kat: "Hufpflege", preis: "14,50 €", empfehlungen: 67, lager: 2100, minBestand: 500, trend: "+3%", sku: "DHT-001" },
  { id: "DEM-007", name: "Demo-Huf-Öl Premium", kat: "Hufpflege", preis: "16,90 €", empfehlungen: 102, lager: 1800, minBestand: 300, trend: "+7%", sku: "DHO-P-001" },
  { id: "DEM-008", name: "Demo-Raspel Pro", kat: "Werkzeug", preis: "89,00 €", empfehlungen: 45, lager: 120, minBestand: 30, trend: "+4%", sku: "DRP-001" },
];

const LIEFERANTEN = [
  { id: "LF-01", name: "Demo-Rohstoff GmbH", ort: "Demo-Stadt A", kontakt: "demo@rohstoff.de", umsatz: "42.300 €", offeneBestellungen: 3, status: "aktiv" },
  { id: "LF-02", name: "Demo-Chemie AG", ort: "Demo-Stadt B", kontakt: "demo@chemie.de", umsatz: "28.100 €", offeneBestellungen: 1, status: "aktiv" },
  { id: "LF-03", name: "Demo-Stahl OHG", ort: "Demo-Stadt C", kontakt: "demo@stahl.de", umsatz: "15.600 €", offeneBestellungen: 0, status: "aktiv" },
  { id: "LF-04", name: "Demo-Verpackung KG", ort: "Demo-Stadt D", kontakt: "demo@verpackung.de", umsatz: "8.900 €", offeneBestellungen: 2, status: "pausiert" },
];

const KATALOG_KATEGORIEN = [
  { name: "Kunststoffbeschläge", produkte: 12, bestseller: "Demo-Composite Gr. 2" },
  { name: "Hufpolster & Einlagen", produkte: 8, bestseller: "Demo-Hufpolster CS" },
  { name: "Hufkleber & Harze", produkte: 6, bestseller: "Demo-Schnellkleber" },
  { name: "Hufpflege", produkte: 15, bestseller: "Demo-Huf-Öl Premium" },
  { name: "Werkzeuge", produkte: 22, bestseller: "Demo-Raspel Pro" },
  { name: "Zubehör", produkte: 10, bestseller: "Demo-Niethammer" },
];

const MONTHLY = [
  { month: "Sep", empfehlungen: 156, bestellungen: 89 }, { month: "Okt", empfehlungen: 178, bestellungen: 102 },
  { month: "Nov", empfehlungen: 203, bestellungen: 118 }, { month: "Dez", empfehlungen: 189, bestellungen: 95 },
  { month: "Jan", empfehlungen: 221, bestellungen: 134 }, { month: "Feb", empfehlungen: 245, bestellungen: 148 },
];

const HAENDLER = [
  { name: "Demo-Reitsport A", ort: "Demo-Stadt A", umsatz: "12.400 €", produkte: 18, status: "aktiv" },
  { name: "Demo-Hufbedarf Online", ort: "Online", umsatz: "28.900 €", produkte: 24, status: "aktiv" },
  { name: "Demo-Pferde-Profi", ort: "Demo-Stadt B", umsatz: "8.700 €", produkte: 12, status: "aktiv" },
  { name: "Demo-Stallbedarf", ort: "Demo-Stadt C", umsatz: "5.200 €", produkte: 8, status: "inaktiv" },
  { name: "Demo-Equi-Store", ort: "Demo-Stadt D", umsatz: "15.300 €", produkte: 20, status: "aktiv" },
];

export default function ManufacturerPortalDemo() {
  const [tab, setTab] = useState("dashboard");
  const [selectedProduct, setSelectedProduct] = useState<typeof PRODUKTE[0] | null>(null);
  const [showNeuesProdukt, setShowNeuesProdukt] = useState(false);

  return (
    <PortalDemoShell title="Hersteller-Portal" orgName="Demo-Hufprodukte GmbH" icon={Factory} iconColor="orange-400" navItems={NAV} activeTab={tab} onTabChange={setTab}>
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-muted-foreground">Produktperformance & Marktüberblick (Demo-Daten)</p></div>
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
              <ResponsiveContainer width="100%" height={200}><BarChart data={MONTHLY}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Bar dataKey="empfehlungen" fill="#f97316" radius={[4,4,0,0]} /><Bar dataKey="bestellungen" fill="#3b82f6" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
            </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">Top-Produkte</CardTitle></CardHeader><CardContent>
              <div className="space-y-3">{PRODUKTE.slice(0, 5).sort((a,b) => b.empfehlungen - a.empfehlungen).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 text-sm"><span className="w-5 text-muted-foreground font-medium">#{i+1}</span><div className="flex-1"><p className="font-medium">{p.name}</p></div><span className="text-muted-foreground">{p.empfehlungen} Empf.</span><Badge variant="outline" className="text-emerald-500">{p.trend}</Badge></div>
              ))}</div>
            </CardContent></Card>
          </div>
        </div>
      )}

      {tab === "produkte" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Produktkatalog</h1><p className="text-sm text-muted-foreground">{PRODUKTE.length} Produkte (Demo-Daten)</p></div><Button onClick={() => setShowNeuesProdukt(true)}><Plus className="h-4 w-4 mr-1" /> Produkt anlegen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Name</TableHead><TableHead>Kategorie</TableHead><TableHead>Preis</TableHead><TableHead>Empfehlungen</TableHead><TableHead>Lager</TableHead><TableHead>Trend</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {PRODUKTE.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedProduct(p)}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell><TableCell className="font-medium">{p.name}</TableCell><TableCell><Badge variant="outline">{p.kat}</Badge></TableCell><TableCell>{p.preis}</TableCell><TableCell>{p.empfehlungen}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><span className={p.lager <= p.minBestand ? "text-red-500 font-medium" : ""}>{p.lager}</span>{p.lager <= p.minBestand && <Badge variant="destructive" className="text-[10px]">Niedrig</Badge>}</div></TableCell>
                  <TableCell><Badge variant="outline" className="text-emerald-500">{p.trend}</Badge></TableCell><TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "katalog" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Produktkatalog</h1><p className="text-sm text-muted-foreground">Kategorien & Sortiment verwalten</p></div><Button><Plus className="h-4 w-4 mr-1" /> Kategorie anlegen</Button></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {KATALOG_KATEGORIEN.map((k) => (
              <Card key={k.name} className="cursor-pointer hover:border-primary/40 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-medium">{k.name}</h3>
                  <p className="text-sm text-muted-foreground">{k.produkte} Produkte</p>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Bestseller: {k.bestseller}</span><Button size="sm" variant="outline" className="h-6 text-xs">Öffnen</Button></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "lager" && (
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">Lagerbestand</h1><p className="text-sm text-muted-foreground">Bestandsübersicht & Nachbestellungen (Demo-Daten)</p></div>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold text-emerald-500">6</p><p className="text-xs text-muted-foreground">Ausreichend</p></CardContent></Card>
            <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold text-amber-500">1</p><p className="text-xs text-muted-foreground">Niedrig</p></CardContent></Card>
            <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold text-red-500">1</p><p className="text-xs text-muted-foreground">Kritisch</p></CardContent></Card>
          </div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Produkt</TableHead><TableHead>SKU</TableHead><TableHead>Bestand</TableHead><TableHead>Min-Bestand</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {PRODUKTE.map((p) => {
                const pct = (p.lager / p.minBestand) * 100;
                const color = pct > 300 ? "text-emerald-500" : pct > 150 ? "text-foreground" : pct > 100 ? "text-amber-500" : "text-red-500";
                return (
                  <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="font-mono text-xs">{p.sku}</TableCell><TableCell className={`font-medium ${color}`}>{p.lager}</TableCell><TableCell>{p.minBestand}</TableCell><TableCell><Progress value={Math.min(pct, 100)} className="h-2 w-20" /></TableCell><TableCell><Button size="sm" variant="outline" className="text-xs">Nachbestellen</Button></TableCell></TableRow>
                );
              })}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "lieferanten" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Lieferanten</h1><p className="text-sm text-muted-foreground">{LIEFERANTEN.length} Lieferanten (Demo-Daten)</p></div><Button><Plus className="h-4 w-4 mr-1" /> Lieferant anlegen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Ort</TableHead><TableHead>Kontakt</TableHead><TableHead>Umsatz (12M)</TableHead><TableHead>Offene Best.</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {LIEFERANTEN.map((l) => (
                <TableRow key={l.id}><TableCell className="font-medium">{l.name}</TableCell><TableCell>{l.ort}</TableCell><TableCell className="text-muted-foreground">{l.kontakt}</TableCell><TableCell className="font-medium">{l.umsatz}</TableCell><TableCell>{l.offeneBestellungen > 0 ? <Badge variant="outline">{l.offeneBestellungen}</Badge> : "–"}</TableCell><TableCell><Badge variant={l.status === "aktiv" ? "default" : "secondary"}>{l.status}</Badge></TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
          <p className="text-[11px] text-muted-foreground text-center">ℹ️ Alle dargestellten Lieferanten sind fiktive Demo-Daten.</p>
        </div>
      )}

      {tab === "empfehlungen" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Empfehlungs-Analytics</h1><p className="text-sm text-muted-foreground">Welche Hufbearbeiter empfehlen Ihre Produkte (Demo-Daten)</p></div>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Empfehlungen über Zeit</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={250}><LineChart data={MONTHLY}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Line type="monotone" dataKey="empfehlungen" stroke="#f97316" strokeWidth={2} /></LineChart></ResponsiveContainer>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Top-Empfehler</CardTitle></CardHeader><CardContent>
            <div className="space-y-3">{["Demo-Hufbearbeiter A (87 Empf.)", "Demo-Hufbearbeiter B (62 Empf.)", "Demo-Hufbearbeiter C (54 Empf.)", "Demo-Hufbearbeiter D (48 Empf.)", "Demo-Hufbearbeiter E (41 Empf.)"].map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm"><div className="flex items-center gap-3"><span className="w-5 text-muted-foreground">#{i+1}</span><span>{e}</span></div><Button size="sm" variant="outline">Profil</Button></div>
            ))}</div>
          </CardContent></Card>
        </div>
      )}

      {tab === "haendler" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Händlernetz</h1><p className="text-sm text-muted-foreground">{HAENDLER.length} Händler (Demo-Daten)</p></div><Button><Plus className="h-4 w-4 mr-1" /> Händler hinzufügen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Ort</TableHead><TableHead>Umsatz</TableHead><TableHead>Produkte</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {HAENDLER.map((h) => (
                <TableRow key={h.name}><TableCell className="font-medium">{h.name}</TableCell><TableCell>{h.ort}</TableCell><TableCell className="font-medium">{h.umsatz}</TableCell><TableCell>{h.produkte}</TableCell><TableCell><Badge variant={h.status === "aktiv" ? "default" : "secondary"}>{h.status}</Badge></TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
          <p className="text-[11px] text-muted-foreground text-center">ℹ️ Alle dargestellten Händler sind fiktive Demo-Daten.</p>
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-sm text-muted-foreground">Nutzungsstatistiken & Marktdaten (Demo-Daten)</p></div>
          <div className="grid lg:grid-cols-3 gap-4">
            {[{ label: "Conversion Rate", value: "4,8%", sub: "Empfehlung → Kauf" }, { label: "Ø Bestellwert", value: "127 €", sub: "Pro Bestellung" }, { label: "Wiederkäufer", value: "68%", sub: "Innerhalb 6 Monate" }].map((m) => (
              <Card key={m.label}><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{m.value}</p><p className="text-sm text-muted-foreground mt-1">{m.label}</p><p className="text-xs text-muted-foreground">{m.sub}</p></CardContent></Card>
            ))}
          </div>
        </div>
      )}

      {tab === "pferdeakten" && <PferdeaktenTab />}
      {tab === "nachrichten" && <ChatTab />}
      {tab === "connect" && <HMConnectTab />}
      {tab === "mitarbeiter" && <MitarbeiterTab orgDomain="demo-hufprodukte.de" />}
      {tab === "nutzer" && <NutzerTab orgDomain="demo-hufprodukte.de" />}
      {tab === "landingpage" && <LandingpageTab orgName="Demo-Hufprodukte GmbH" />}

      {/* Product Detail */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent><DialogHeader><DialogTitle>{selectedProduct?.name}</DialogTitle><DialogDescription>{selectedProduct?.kat} · {selectedProduct?.sku}</DialogDescription></DialogHeader>
          {selectedProduct && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Preis:</span> <span className="font-medium">{selectedProduct.preis}</span></div>
                <div><span className="text-muted-foreground">Lagerbestand:</span> <span className="font-medium">{selectedProduct.lager}</span></div>
                <div><span className="text-muted-foreground">Min-Bestand:</span> <span className="font-medium">{selectedProduct.minBestand}</span></div>
                <div><span className="text-muted-foreground">Empfehlungen:</span> <span className="font-medium">{selectedProduct.empfehlungen}</span></div>
              </div>
              <div className="flex gap-2 pt-2"><Button size="sm">Bearbeiten</Button><Button size="sm" variant="outline">Statistiken</Button><Button size="sm" variant="outline">Nachbestellen</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Neues Produkt */}
      <Dialog open={showNeuesProdukt} onOpenChange={setShowNeuesProdukt}>
        <DialogContent><DialogHeader><DialogTitle>Neues Produkt anlegen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Produktname" /><Input placeholder="SKU / Artikelnummer" />
            <Select><SelectTrigger><SelectValue placeholder="Kategorie" /></SelectTrigger><SelectContent>{KATALOG_KATEGORIEN.map(k => <SelectItem key={k.name} value={k.name}>{k.name}</SelectItem>)}</SelectContent></Select>
            <div className="grid grid-cols-2 gap-3"><Input placeholder="Preis (€ netto)" /><Input placeholder="Min-Bestand" type="number" /></div>
            <Textarea placeholder="Produktbeschreibung…" rows={3} />
            <Button className="w-full" onClick={() => setShowNeuesProdukt(false)}>Produkt anlegen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PortalDemoShell>
  );
}
