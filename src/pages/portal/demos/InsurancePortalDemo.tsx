import { useState } from "react";
import { Shield, LayoutDashboard, FileText, AlertCircle, BarChart3, Users, TrendingUp, CheckCircle, Clock, XCircle, Eye, ChevronRight, Heart, MessageSquare, Link2, Globe, Briefcase, Plus, Download, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { PortalDemoShell } from "./PortalDemoShell";
import { PferdeaktenTab, ChatTab, HMConnectTab, NutzerTab, MitarbeiterTab, LandingpageTab } from "./shared/SharedPortalTabs";
import { DEMO_PFERDE } from "./shared/DemoPortalData";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "policen", label: "Policen", icon: FileText },
  { id: "schaeden", label: "Schadensfälle", icon: AlertCircle },
  { id: "praevention", label: "Präventions-Score", icon: BarChart3 },
  { id: "portfolio", label: "Portfolio", icon: TrendingUp },
  { id: "pferdeakten", label: "Pferdeakten", icon: Heart },
  { id: "nachrichten", label: "Nachrichten", icon: MessageSquare },
  { id: "connect", label: "HM Connect", icon: Link2 },
  { id: "mitarbeiter", label: "Mitarbeiter", icon: Briefcase },
  { id: "nutzer", label: "Nutzer", icon: Users },
  { id: "landingpage", label: "Website", icon: Globe },
];

const POLICEN = [
  { id: "P-2024-001", pferd: "Amara", halter: "Demo-Besitzer A", typ: "OP + Haftpflicht", status: "aktiv", wert: "4.200 €", beginn: "01.03.2024", ende: "28.02.2025", praemie: "89 €/Mon", deckung: "OP-Kosten bis 10.000 €, Haftpflicht bis 5 Mio €", selbstbeteiligung: "250 €", zahlweise: "Monatlich", vertragsnr: "VN-2024-100847" },
  { id: "P-2024-002", pferd: "Nordlicht", halter: "Demo-Besitzer B", typ: "Vollkasko", status: "aktiv", wert: "8.500 €", beginn: "15.04.2024", ende: "14.04.2025", praemie: "145 €/Mon", deckung: "Vollkasko inkl. Tierarzt, OP, Medikamente", selbstbeteiligung: "500 €", zahlweise: "Quartalsweise", vertragsnr: "VN-2024-100923" },
  { id: "P-2024-003", pferd: "Windstoß", halter: "Demo-Besitzer C", typ: "OP-Versicherung", status: "aktiv", wert: "3.800 €", beginn: "01.06.2024", ende: "31.05.2025", praemie: "72 €/Mon", deckung: "OP-Kosten bis 7.500 €", selbstbeteiligung: "200 €", zahlweise: "Monatlich", vertragsnr: "VN-2024-101055" },
  { id: "P-2024-004", pferd: "Pfeffer", halter: "Demo-Besitzer D", typ: "Haftpflicht", status: "auslaufend", wert: "1.200 €", beginn: "01.01.2024", ende: "31.03.2025", praemie: "28 €/Mon", deckung: "Haftpflicht bis 3 Mio €", selbstbeteiligung: "150 €", zahlweise: "Jährlich", vertragsnr: "VN-2024-100512" },
  { id: "P-2024-005", pferd: "Schattenspiel", halter: "Demo-Besitzer E", typ: "OP + Haftpflicht", status: "aktiv", wert: "5.100 €", beginn: "10.08.2024", ende: "09.08.2025", praemie: "98 €/Mon", deckung: "OP bis 12.000 €, Haftpflicht bis 5 Mio €", selbstbeteiligung: "300 €", zahlweise: "Monatlich", vertragsnr: "VN-2024-101187" },
  { id: "P-2024-006", pferd: "Goldstaub", halter: "Demo-Besitzer F", typ: "Vollkasko", status: "gekündigt", wert: "7.200 €", beginn: "01.02.2024", ende: "31.01.2025", praemie: "135 €/Mon", deckung: "Vollkasko inkl. Alternativmedizin", selbstbeteiligung: "400 €", zahlweise: "Halbjährlich", vertragsnr: "VN-2024-100689" },
];

const SCHAEDEN = [
  { id: "S-001", pferd: "Nordlicht", typ: "Kolik-OP", datum: "12.01.2025", status: "in_pruefung", betrag: "3.400 €", halter: "Demo-Besitzer B", klinik: "Demo-Pferdeklinik Nord", beschreibung: "Notfall-Kolik-OP nach akuter Kolik-Symptomatik. Chirurgische Intervention erforderlich.", dokumente: 3 },
  { id: "S-002", pferd: "Windstoß", typ: "Huf-Rehe Behandlung", datum: "28.12.2024", status: "genehmigt", betrag: "1.850 €", halter: "Demo-Besitzer C", klinik: "Demo-Tierarztpraxis Mitte", beschreibung: "Akute Hufrehe mit stationärer Behandlung über 5 Tage.", dokumente: 5 },
  { id: "S-003", pferd: "Amara", typ: "Sehnenverletzung", datum: "05.02.2025", status: "offen", betrag: "2.200 €", halter: "Demo-Besitzer A", klinik: "Demo-Pferdeklinik Süd", beschreibung: "Sehnenverletzung vorne rechts, Ultraschall + Stammzelltherapie.", dokumente: 2 },
  { id: "S-004", pferd: "Schattenspiel", typ: "Zahnbehandlung", datum: "20.11.2024", status: "abgeschlossen", betrag: "680 €", halter: "Demo-Besitzer E", klinik: "Demo-Equidentalpraxis", beschreibung: "Zahnkorrektur mit Sedierung, 2 Wolfszähne entfernt.", dokumente: 1 },
];

const MONTHLY_DATA = [
  { month: "Jul", policen: 2340, schaeden: 12 }, { month: "Aug", policen: 2420, schaeden: 8 },
  { month: "Sep", policen: 2510, schaeden: 15 }, { month: "Okt", policen: 2580, schaeden: 11 },
  { month: "Nov", policen: 2690, schaeden: 19 }, { month: "Dez", policen: 2750, schaeden: 14 },
  { month: "Jan", policen: 2780, schaeden: 22 }, { month: "Feb", policen: 2847, schaeden: 18 },
];

const PORTFOLIO_PIE = [
  { name: "OP-Versicherung", value: 45, color: "#3b82f6" },
  { name: "Haftpflicht", value: 25, color: "#10b981" },
  { name: "Vollkasko", value: 20, color: "#f59e0b" },
  { name: "OP + Haftpflicht", value: 10, color: "#8b5cf6" },
];

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    aktiv: { label: "Aktiv", variant: "default" },
    auslaufend: { label: "Auslaufend", variant: "outline" },
    gekündigt: { label: "Gekündigt", variant: "destructive" },
    offen: { label: "Offen", variant: "outline" },
    in_pruefung: { label: "In Prüfung", variant: "secondary" },
    genehmigt: { label: "Genehmigt", variant: "default" },
    abgeschlossen: { label: "Abgeschlossen", variant: "secondary" },
  };
  const cfg = map[s] || { label: s, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

export default function InsurancePortalDemo() {
  const [tab, setTab] = useState("dashboard");
  const [selectedPolice, setSelectedPolice] = useState<typeof POLICEN[0] | null>(null);
  const [selectedSchaden, setSelectedSchaden] = useState<typeof SCHAEDEN[0] | null>(null);
  const [showNeuePolice, setShowNeuePolice] = useState(false);
  const [showSchadenMelden, setShowSchadenMelden] = useState(false);

  return (
    <PortalDemoShell
      title="Versicherungs-Portal"
      orgName="Demo-Versicherung AG"
      icon={Shield}
      iconColor="blue-400"
      navItems={NAV}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "dashboard" && <DashboardView onNavigate={setTab} />}
      {tab === "policen" && <PolicenView onSelect={setSelectedPolice} onNeue={() => setShowNeuePolice(true)} />}
      {tab === "schaeden" && <SchaedenView onSelect={setSelectedSchaden} onMelden={() => setShowSchadenMelden(true)} />}
      {tab === "praevention" && <PraeventionView />}
      {tab === "portfolio" && <PortfolioView />}
      {tab === "pferdeakten" && <PferdeaktenTab />}
      {tab === "nachrichten" && <ChatTab />}
      {tab === "connect" && <HMConnectTab />}
      {tab === "mitarbeiter" && <MitarbeiterTab orgDomain="demo-versicherung.de" />}
      {tab === "nutzer" && <NutzerTab orgDomain="demo-versicherung.de" />}
      {tab === "landingpage" && <LandingpageTab orgName="Demo-Versicherung AG" />}

      {/* Police Detail Dialog */}
      <Dialog open={!!selectedPolice} onOpenChange={() => setSelectedPolice(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Police {selectedPolice?.id} {selectedPolice && statusBadge(selectedPolice.status)}</DialogTitle>
            <DialogDescription>{selectedPolice?.pferd} – {selectedPolice?.halter}</DialogDescription>
          </DialogHeader>
          {selectedPolice && (
            <div className="space-y-4">
              <Tabs defaultValue="details">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="deckung">Deckung</TabsTrigger>
                  <TabsTrigger value="historie">Historie</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-3 text-sm mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-muted-foreground">Vertragsnr.:</span> <span className="font-mono font-medium">{selectedPolice.vertragsnr}</span></div>
                    <div><span className="text-muted-foreground">Typ:</span> <span className="font-medium">{selectedPolice.typ}</span></div>
                    <div><span className="text-muted-foreground">Versicherungswert:</span> <span className="font-medium">{selectedPolice.wert}</span></div>
                    <div><span className="text-muted-foreground">Prämie:</span> <span className="font-medium">{selectedPolice.praemie}</span></div>
                    <div><span className="text-muted-foreground">Beginn:</span> {selectedPolice.beginn}</div>
                    <div><span className="text-muted-foreground">Ende:</span> {selectedPolice.ende}</div>
                    <div><span className="text-muted-foreground">Zahlweise:</span> {selectedPolice.zahlweise}</div>
                    <div><span className="text-muted-foreground">Selbstbeteiligung:</span> <span className="font-medium">{selectedPolice.selbstbeteiligung}</span></div>
                  </div>
                </TabsContent>
                <TabsContent value="deckung" className="space-y-3 text-sm mt-3">
                  <Card><CardContent className="p-4"><p className="text-muted-foreground">Deckungsumfang:</p><p className="font-medium mt-1">{selectedPolice.deckung}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-muted-foreground">Wartezeit:</p><p className="font-medium mt-1">30 Tage (OP), keine (Haftpflicht)</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-muted-foreground">Ausschlüsse:</p><p className="font-medium mt-1">Vorerkrankungen, kosmetische Eingriffe, Zuchtrisiken</p></CardContent></Card>
                </TabsContent>
                <TabsContent value="historie" className="space-y-2 text-sm mt-3">
                  {[
                    { datum: "01.03.2024", aktion: "Vertrag abgeschlossen", von: "Demo-Admin" },
                    { datum: "15.06.2024", aktion: "Prämienanpassung +3%", von: "System" },
                    { datum: "01.01.2025", aktion: "Verlängerung bestätigt", von: "Demo-Besitzer" },
                  ].map((h, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0"><span className="text-muted-foreground w-24 shrink-0">{h.datum}</span><span>{h.aktion}</span><Badge variant="outline" className="ml-auto text-[10px]">{h.von}</Badge></div>
                  ))}
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline">Verlängern</Button>
                <Button size="sm" variant="outline">Schaden melden</Button>
                <Button size="sm" variant="outline"><Download className="h-3 w-3 mr-1" />PDF exportieren</Button>
                <Button size="sm" variant="outline">Bearbeiten</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schaden Detail Dialog */}
      <Dialog open={!!selectedSchaden} onOpenChange={() => setSelectedSchaden(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Schadensfall {selectedSchaden?.id} {selectedSchaden && statusBadge(selectedSchaden.status)}</DialogTitle>
            <DialogDescription>{selectedSchaden?.pferd} – {selectedSchaden?.typ}</DialogDescription>
          </DialogHeader>
          {selectedSchaden && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Halter:</span> <span className="font-medium">{selectedSchaden.halter}</span></div>
                <div><span className="text-muted-foreground">Betrag:</span> <span className="font-medium">{selectedSchaden.betrag}</span></div>
                <div><span className="text-muted-foreground">Datum:</span> {selectedSchaden.datum}</div>
                <div><span className="text-muted-foreground">Klinik:</span> <span className="font-medium">{selectedSchaden.klinik}</span></div>
              </div>
              <Card><CardContent className="p-3"><p className="text-muted-foreground text-xs">Beschreibung:</p><p className="mt-1">{selectedSchaden.beschreibung}</p></CardContent></Card>
              <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span>{selectedSchaden.dokumente} Dokument(e) angehängt</span></div>
              <div className="flex gap-2 pt-2">
                <Button size="sm">Genehmigen</Button>
                <Button size="sm" variant="outline">Nachfrage stellen</Button>
                <Button size="sm" variant="destructive">Ablehnen</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Neue Police Dialog */}
      <Dialog open={showNeuePolice} onOpenChange={setShowNeuePolice}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Neue Police anlegen</DialogTitle><DialogDescription>Erstellen Sie eine neue Versicherungspolice</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Pferd</label><Select><SelectTrigger><SelectValue placeholder="Pferd wählen" /></SelectTrigger><SelectContent>{DEMO_PFERDE.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-sm font-medium">Halter</label><Input placeholder="Demo-Besitzer" /></div>
              <div><label className="text-sm font-medium">Versicherungstyp</label><Select><SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger><SelectContent><SelectItem value="op">OP-Versicherung</SelectItem><SelectItem value="haftpflicht">Haftpflicht</SelectItem><SelectItem value="vollkasko">Vollkasko</SelectItem><SelectItem value="op-haftpflicht">OP + Haftpflicht</SelectItem></SelectContent></Select></div>
              <div><label className="text-sm font-medium">Prämie / Monat</label><Input placeholder="z.B. 89 €" /></div>
              <div><label className="text-sm font-medium">Beginn</label><Input type="date" /></div>
              <div><label className="text-sm font-medium">Ende</label><Input type="date" /></div>
            </div>
            <div><label className="text-sm font-medium">Selbstbeteiligung</label><Input placeholder="z.B. 250 €" /></div>
            <div><label className="text-sm font-medium">Deckungsumfang</label><Textarea placeholder="Beschreibung der Deckung…" /></div>
            <Button className="w-full" onClick={() => setShowNeuePolice(false)}>Police anlegen</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schaden melden Dialog */}
      <Dialog open={showSchadenMelden} onOpenChange={setShowSchadenMelden}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Schadensfall melden</DialogTitle><DialogDescription>Erfassen Sie einen neuen Versicherungsschaden</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Pferd</label><Select><SelectTrigger><SelectValue placeholder="Pferd wählen" /></SelectTrigger><SelectContent>{DEMO_PFERDE.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-sm font-medium">Schadenstyp</label><Select><SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger><SelectContent><SelectItem value="op">OP</SelectItem><SelectItem value="krankheit">Krankheit</SelectItem><SelectItem value="unfall">Unfall</SelectItem><SelectItem value="zahn">Zahnbehandlung</SelectItem><SelectItem value="sonstiges">Sonstiges</SelectItem></SelectContent></Select></div>
              <div><label className="text-sm font-medium">Schadensdatum</label><Input type="date" /></div>
              <div><label className="text-sm font-medium">Geschätzter Betrag</label><Input placeholder="z.B. 2.500 €" /></div>
            </div>
            <div><label className="text-sm font-medium">Behandelnde Klinik / Tierarzt</label><Input placeholder="Name der Klinik…" /></div>
            <div><label className="text-sm font-medium">Beschreibung</label><Textarea placeholder="Was ist passiert? Diagnose, Behandlung…" rows={3} /></div>
            <div><label className="text-sm font-medium">Dokumente</label><div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground text-sm"><p>Dateien hierher ziehen oder klicken</p><p className="text-xs mt-1">Tierarztberichte, Rechnungen, Fotos</p></div></div>
            <Card className="bg-muted/50"><CardContent className="p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">📋 Auto-Anhang aus Pferdeakte:</p>
              <p>Die letzten 3 Behandlungstermine, aktuelle Hufanalyse und Impfstatus werden automatisch als Dossier angehängt.</p>
            </CardContent></Card>
            <Button className="w-full" onClick={() => setShowSchadenMelden(false)}>Schadensfall einreichen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PortalDemoShell>
  );
}

function DashboardView({ onNavigate }: { onNavigate: (t: string) => void }) {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-muted-foreground">Übersicht Ihrer Versicherungsaktivitäten (Demo-Daten)</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Aktive Policen", value: "2.847", icon: FileText, change: "+3,2%" },
          { label: "Offene Schäden", value: "23", icon: AlertCircle, change: "-12%" },
          { label: "Präventions-Score", value: "78%", icon: BarChart3, change: "+5%" },
          { label: "Portfolio-Wert", value: "4,2M €", icon: TrendingUp, change: "+8,1%" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="pt-5"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div><s.icon className="h-5 w-5 text-muted-foreground" /></div><p className="text-xs text-emerald-500 mt-2">{s.change} vs. Vormonat</p></CardContent></Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Policen-Entwicklung</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}><LineChart data={MONTHLY_DATA}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Line type="monotone" dataKey="policen" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Schadensfälle / Monat</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}><BarChart data={MONTHLY_DATA}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Bar dataKey="schaeden" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        </CardContent></Card>
      </div>
      <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">Letzte Schadensfälle</CardTitle><Button variant="ghost" size="sm" onClick={() => onNavigate("schaeden")}>Alle anzeigen <ChevronRight className="h-3 w-3 ml-1" /></Button></div></CardHeader><CardContent>
        <div className="space-y-3">{SCHAEDEN.slice(0, 3).map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm"><div className="flex items-center gap-3"><AlertCircle className="h-4 w-4 text-muted-foreground" /><div><p className="font-medium">{s.pferd} – {s.typ}</p><p className="text-xs text-muted-foreground">{s.datum} · {s.halter}</p></div></div><div className="flex items-center gap-3"><span className="font-medium">{s.betrag}</span>{statusBadge(s.status)}</div></div>
        ))}</div>
      </CardContent></Card>
    </div>
  );
}

function PolicenView({ onSelect, onNeue }: { onSelect: (p: typeof POLICEN[0]) => void; onNeue: () => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("alle");
  const filtered = POLICEN.filter(p => {
    if (filter !== "alle" && p.status !== filter) return false;
    if (search && !p.pferd.toLowerCase().includes(search.toLowerCase()) && !p.halter.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Policen-Verwaltung</h1><p className="text-sm text-muted-foreground">{POLICEN.length} Policen insgesamt (Demo-Daten)</p></div>
        <Button onClick={onNeue}><Plus className="h-4 w-4 mr-1" /> Neue Police</Button>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Pferd oder Halter suchen…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="alle">Alle Status</SelectItem><SelectItem value="aktiv">Aktiv</SelectItem><SelectItem value="auslaufend">Auslaufend</SelectItem><SelectItem value="gekündigt">Gekündigt</SelectItem></SelectContent></Select>
      </div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Police-Nr.</TableHead><TableHead>Pferd</TableHead><TableHead>Halter</TableHead><TableHead>Typ</TableHead><TableHead>Prämie</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
          {filtered.map((p) => (
            <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(p)}>
              <TableCell className="font-mono text-xs">{p.id}</TableCell><TableCell className="font-medium">{p.pferd}</TableCell><TableCell>{p.halter}</TableCell><TableCell>{p.typ}</TableCell><TableCell>{p.praemie}</TableCell><TableCell>{statusBadge(p.status)}</TableCell><TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
    </div>
  );
}

function SchaedenView({ onSelect, onMelden }: { onSelect: (s: typeof SCHAEDEN[0]) => void; onMelden: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Schadensfälle</h1><p className="text-sm text-muted-foreground">{SCHAEDEN.length} Fälle (Demo-Daten)</p></div>
        <Button onClick={onMelden}><Plus className="h-4 w-4 mr-1" /> Schaden melden</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Fall-Nr.</TableHead><TableHead>Pferd</TableHead><TableHead>Typ</TableHead><TableHead>Datum</TableHead><TableHead>Betrag</TableHead><TableHead>Dokumente</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
          {SCHAEDEN.map((s) => (
            <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(s)}>
              <TableCell className="font-mono text-xs">{s.id}</TableCell><TableCell className="font-medium">{s.pferd}</TableCell><TableCell>{s.typ}</TableCell><TableCell>{s.datum}</TableCell><TableCell className="font-medium">{s.betrag}</TableCell><TableCell><div className="flex items-center gap-1"><FileText className="h-3 w-3" />{s.dokumente}</div></TableCell><TableCell>{statusBadge(s.status)}</TableCell><TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
    </div>
  );
}

function PraeventionView() {
  const scores = [
    { kategorie: "Hufpflege-Regelmäßigkeit", score: 85, max: 100, detail: "Alle 6-8 Wochen professionelle Bearbeitung", icon: "🔨" },
    { kategorie: "Tierarzt-Vorsorge", score: 72, max: 100, detail: "Jährliche Kontrolle, Zahnsanierung", icon: "🩺" },
    { kategorie: "Haltungsbedingungen", score: 90, max: 100, detail: "Weide, Offenstall, Paddockbox", icon: "🏠" },
    { kategorie: "Fütterung & Gewicht", score: 68, max: 100, detail: "BCS-Dokumentation, Mineralanalyse", icon: "🥕" },
    { kategorie: "Bewegung & Training", score: 78, max: 100, detail: "Regelmäßiges Training, Longieren", icon: "🏃" },
    { kategorie: "Impfstatus", score: 92, max: 100, detail: "Influenza, Tetanus, Herpes aktuell", icon: "💉" },
    { kategorie: "Dokumentation", score: 88, max: 100, detail: "Digitale Pferdeakte vollständig", icon: "📋" },
  ];
  const avgScore = Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length);
  const radarData = scores.map(s => ({ subject: s.kategorie.split(" ")[0], A: s.score }));

  const gradeLabel = (s: number) => s >= 90 ? "A+" : s >= 80 ? "A" : s >= 70 ? "B" : s >= 60 ? "C" : "D";
  const gradeColor = (s: number) => s >= 80 ? "text-emerald-500" : s >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Präventions-Score</h1><p className="text-sm text-muted-foreground">Gesundheitsvorsorge-Bewertung für versicherte Pferde (Demo-Daten)</p></div>
      
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="w-32 h-32 rounded-full border-8 border-primary/20 flex items-center justify-center mx-auto">
              <div className="text-center"><span className="text-4xl font-bold">{avgScore}%</span><p className={`text-lg font-bold ${gradeColor(avgScore)}`}>{gradeLabel(avgScore)}</p></div>
            </div>
            <p className="text-sm text-muted-foreground">Gesamt-Score über alle Kategorien</p>
            <div className="text-xs space-y-1">
              <div className="flex justify-between"><span>A+ (90-100)</span><span className="text-emerald-500">Exzellent</span></div>
              <div className="flex justify-between"><span>A (80-89)</span><span className="text-emerald-500">Sehr gut</span></div>
              <div className="flex justify-between"><span>B (70-79)</span><span className="text-amber-500">Gut</span></div>
              <div className="flex justify-between"><span>C (60-69)</span><span className="text-amber-500">Ausbaufähig</span></div>
              <div className="flex justify-between"><span>D (&lt;60)</span><span className="text-red-500">Kritisch</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Einzelbewertungen</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {scores.map((s) => (
              <div key={s.kategorie} className="space-y-1">
                <div className="flex justify-between text-sm items-center">
                  <span className="flex items-center gap-2"><span>{s.icon}</span>{s.kategorie}</span>
                  <span className={`font-bold ${gradeColor(s.score)}`}>{s.score}% ({gradeLabel(s.score)})</span>
                </div>
                <Progress value={s.score} className="h-2" />
                <p className="text-xs text-muted-foreground">{s.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Score-Radar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}><PolarGrid /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} /><PolarRadiusAxis angle={90} domain={[0, 100]} /><Radar name="Score" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} /></RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Empfehlungen zur Score-Verbesserung</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { tip: "Regelmäßige Zahnkontrollen alle 12 Monate einplanen", impact: "+5%", prio: "hoch" },
                { tip: "Gewichtskontrolle: Body Condition Score monatlich dokumentieren", impact: "+4%", prio: "mittel" },
                { tip: "Wurmkur-Protokoll digital in der Pferdeakte führen", impact: "+3%", prio: "mittel" },
                { tip: "Mineralfutter-Analyse jährlich durchführen lassen", impact: "+3%", prio: "niedrig" },
                { tip: "Thermografie-Check für Früherkennung einplanen", impact: "+2%", prio: "niedrig" },
              ].map((t) => (
                <div key={t.tip} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="flex-1"><p>{t.tip}</p><Badge variant="outline" className="text-[10px] mt-1">{t.prio}</Badge></div>
                  <Badge variant="outline" className="text-emerald-500 shrink-0">{t.impact}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Risikoübersicht nach Pferd</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead>Pferd</TableHead><TableHead>Besitzer</TableHead><TableHead>Score</TableHead><TableHead>Grade</TableHead><TableHead>Risiko</TableHead></TableRow></TableHeader><TableBody>
            {DEMO_PFERDE.map(p => (
              <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.besitzer}</TableCell><TableCell><div className="flex items-center gap-2"><Progress value={p.praeventionScore} className="h-2 w-16" /><span className="text-sm font-medium">{p.praeventionScore}%</span></div></TableCell><TableCell><span className={`font-bold ${gradeColor(p.praeventionScore)}`}>{gradeLabel(p.praeventionScore)}</span></TableCell><TableCell>{p.praeventionScore >= 80 ? "🟢" : p.praeventionScore >= 60 ? "🟡" : "🔴"}</TableCell></TableRow>
            ))}
          </TableBody></Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PortfolioView() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Portfolio-Analyse</h1><p className="text-sm text-muted-foreground">Überblick über Ihr Versicherungsportfolio (Demo-Daten)</p></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">Verteilung nach Typ</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={PORTFOLIO_PIE} dataKey="value" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{PORTFOLIO_PIE.map((entry) => (<Cell key={entry.name} fill={entry.color} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Portfolio-Kennzahlen</CardTitle></CardHeader><CardContent className="space-y-4">
          {[
            { label: "Gesamtwert aller Policen", value: "4.200.000 €" },
            { label: "Durchschnittliche Prämie", value: "94,50 €/Mon" },
            { label: "Schadensquote (12 Mon.)", value: "12,3%" },
            { label: "Verlängerungsrate", value: "91,5%" },
            { label: "Neuabschlüsse (Q1)", value: "127" },
            { label: "Versicherungsquote im Bestand", value: "67%" },
          ].map((k) => (
            <div key={k.label} className="flex justify-between text-sm"><span className="text-muted-foreground">{k.label}</span><span className="font-medium">{k.value}</span></div>
          ))}
        </CardContent></Card>
      </div>
    </div>
  );
}
