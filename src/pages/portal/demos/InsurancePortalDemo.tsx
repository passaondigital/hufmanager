import { useState } from "react";
import { Shield, LayoutDashboard, FileText, AlertCircle, BarChart3, Users, TrendingUp, CheckCircle, Clock, XCircle, Eye, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { PortalDemoShell } from "./PortalDemoShell";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "policen", label: "Policen", icon: FileText },
  { id: "schaeden", label: "Schadensfälle", icon: AlertCircle },
  { id: "praevention", label: "Präventions-Score", icon: BarChart3 },
  { id: "portfolio", label: "Portfolio", icon: TrendingUp },
  { id: "nutzer", label: "Nutzer", icon: Users },
];

const POLICEN = [
  { id: "P-2024-001", pferd: "Stella vom Sonnenhof", halter: "Maria Fischer", typ: "OP + Haftpflicht", status: "aktiv", wert: "4.200 €", beginn: "01.03.2024", ende: "28.02.2025", praemie: "89 €/Mon" },
  { id: "P-2024-002", pferd: "Luna", halter: "Thomas Weber", typ: "Vollkasko", status: "aktiv", wert: "8.500 €", beginn: "15.04.2024", ende: "14.04.2025", praemie: "145 €/Mon" },
  { id: "P-2024-003", pferd: "Blitz", halter: "Sabine Müller", typ: "OP-Versicherung", status: "aktiv", wert: "3.800 €", beginn: "01.06.2024", ende: "31.05.2025", praemie: "72 €/Mon" },
  { id: "P-2024-004", pferd: "Pepper", halter: "Jan Schmidt", typ: "Haftpflicht", status: "auslaufend", wert: "1.200 €", beginn: "01.01.2024", ende: "31.03.2025", praemie: "28 €/Mon" },
  { id: "P-2024-005", pferd: "Shadow", halter: "Lisa Braun", typ: "OP + Haftpflicht", status: "aktiv", wert: "5.100 €", beginn: "10.08.2024", ende: "09.08.2025", praemie: "98 €/Mon" },
  { id: "P-2024-006", pferd: "Ginger", halter: "Anna Hoffmann", typ: "Vollkasko", status: "gekündigt", wert: "7.200 €", beginn: "01.02.2024", ende: "31.01.2025", praemie: "135 €/Mon" },
];

const SCHAEDEN = [
  { id: "S-001", pferd: "Luna", typ: "Kolik-OP", datum: "12.01.2025", status: "in_pruefung", betrag: "3.400 €", halter: "Thomas Weber" },
  { id: "S-002", pferd: "Blitz", typ: "Huf-Rehe Behandlung", datum: "28.12.2024", status: "genehmigt", betrag: "1.850 €", halter: "Sabine Müller" },
  { id: "S-003", pferd: "Stella vom Sonnenhof", typ: "Sehnenverletzung", datum: "05.02.2025", status: "offen", betrag: "2.200 €", halter: "Maria Fischer" },
  { id: "S-004", pferd: "Shadow", typ: "Zahnbehandlung", datum: "20.11.2024", status: "abgeschlossen", betrag: "680 €", halter: "Lisa Braun" },
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

  return (
    <PortalDemoShell
      title="Versicherungs-Portal"
      orgName="Fischer Versicherung"
      icon={Shield}
      iconColor="blue-400"
      navItems={NAV}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "dashboard" && <DashboardView onNavigate={setTab} />}
      {tab === "policen" && <PolicenView onSelect={setSelectedPolice} />}
      {tab === "schaeden" && <SchaedenView onSelect={setSelectedSchaden} />}
      {tab === "praevention" && <PraeventionView />}
      {tab === "portfolio" && <PortfolioView />}
      {tab === "nutzer" && <NutzerView />}

      <Dialog open={!!selectedPolice} onOpenChange={() => setSelectedPolice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Police {selectedPolice?.id}</DialogTitle>
            <DialogDescription>{selectedPolice?.pferd} – {selectedPolice?.halter}</DialogDescription>
          </DialogHeader>
          {selectedPolice && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Typ:</span> <span className="font-medium">{selectedPolice.typ}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(selectedPolice.status)}</div>
                <div><span className="text-muted-foreground">Versicherungswert:</span> <span className="font-medium">{selectedPolice.wert}</span></div>
                <div><span className="text-muted-foreground">Prämie:</span> <span className="font-medium">{selectedPolice.praemie}</span></div>
                <div><span className="text-muted-foreground">Beginn:</span> {selectedPolice.beginn}</div>
                <div><span className="text-muted-foreground">Ende:</span> {selectedPolice.ende}</div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline">Verlängern</Button>
                <Button size="sm" variant="outline">Schaden melden</Button>
                <Button size="sm" variant="outline">PDF exportieren</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedSchaden} onOpenChange={() => setSelectedSchaden(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schadensfall {selectedSchaden?.id}</DialogTitle>
            <DialogDescription>{selectedSchaden?.pferd} – {selectedSchaden?.typ}</DialogDescription>
          </DialogHeader>
          {selectedSchaden && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Halter:</span> <span className="font-medium">{selectedSchaden.halter}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(selectedSchaden.status)}</div>
                <div><span className="text-muted-foreground">Betrag:</span> <span className="font-medium">{selectedSchaden.betrag}</span></div>
                <div><span className="text-muted-foreground">Datum:</span> {selectedSchaden.datum}</div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm">Genehmigen</Button>
                <Button size="sm" variant="outline">Nachfrage</Button>
                <Button size="sm" variant="destructive">Ablehnen</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalDemoShell>
  );
}

function DashboardView({ onNavigate }: { onNavigate: (t: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Übersicht Ihrer Versicherungsaktivitäten</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Aktive Policen", value: "2.847", icon: FileText, change: "+3,2%" },
          { label: "Offene Schäden", value: "23", icon: AlertCircle, change: "-12%" },
          { label: "Präventions-Score", value: "78%", icon: BarChart3, change: "+5%" },
          { label: "Portfolio-Wert", value: "4,2M €", icon: TrendingUp, change: "+8,1%" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-emerald-500 mt-2">{s.change} vs. Vormonat</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Policen-Entwicklung</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Line type="monotone" dataKey="policen" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Schadensfälle / Monat</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="schaeden" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Letzte Schadensfälle</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("schaeden")}>Alle anzeigen <ChevronRight className="h-3 w-3 ml-1" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SCHAEDEN.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{s.pferd} – {s.typ}</p>
                    <p className="text-xs text-muted-foreground">{s.datum} · {s.halter}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{s.betrag}</span>
                  {statusBadge(s.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PolicenView({ onSelect }: { onSelect: (p: typeof POLICEN[0]) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policen-Verwaltung</h1>
          <p className="text-sm text-muted-foreground">{POLICEN.length} Policen insgesamt</p>
        </div>
        <Button>+ Neue Police</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Police-Nr.</TableHead>
                <TableHead>Pferd</TableHead>
                <TableHead>Halter</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Prämie</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {POLICEN.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(p)}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.pferd}</TableCell>
                  <TableCell>{p.halter}</TableCell>
                  <TableCell>{p.typ}</TableCell>
                  <TableCell>{p.praemie}</TableCell>
                  <TableCell>{statusBadge(p.status)}</TableCell>
                  <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SchaedenView({ onSelect }: { onSelect: (s: typeof SCHAEDEN[0]) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schadensfälle</h1>
          <p className="text-sm text-muted-foreground">{SCHAEDEN.length} Fälle</p>
        </div>
        <Button>+ Schaden melden</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fall-Nr.</TableHead>
                <TableHead>Pferd</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Betrag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SCHAEDEN.map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(s)}>
                  <TableCell className="font-mono text-xs">{s.id}</TableCell>
                  <TableCell className="font-medium">{s.pferd}</TableCell>
                  <TableCell>{s.typ}</TableCell>
                  <TableCell>{s.datum}</TableCell>
                  <TableCell className="font-medium">{s.betrag}</TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                  <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PraeventionView() {
  const scores = [
    { kategorie: "Hufpflege-Regelmäßigkeit", score: 85, max: 100 },
    { kategorie: "Tierarzt-Vorsorge", score: 72, max: 100 },
    { kategorie: "Haltungsbedingungen", score: 90, max: 100 },
    { kategorie: "Fütterung & Gewicht", score: 68, max: 100 },
    { kategorie: "Bewegung & Training", score: 78, max: 100 },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Präventions-Score</h1>
        <p className="text-sm text-muted-foreground">Gesundheitsvorsorge-Bewertung für versicherte Pferde</p>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 text-center">
            <div className="w-32 h-32 rounded-full border-8 border-primary/20 flex items-center justify-center mx-auto relative">
              <div className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent border-r-transparent rotate-[210deg]" />
              <span className="text-4xl font-bold">78%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3">Gesamt-Score</p>
            <Badge className="mt-2">Gut</Badge>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Einzelbewertungen</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {scores.map((s) => (
              <div key={s.kategorie} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{s.kategorie}</span>
                  <span className="font-medium">{s.score}%</span>
                </div>
                <Progress value={s.score} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Empfehlungen zur Score-Verbesserung</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { tip: "Regelmäßige Zahnkontrollen alle 12 Monate einplanen", impact: "+5%" },
              { tip: "Gewichtskontrolle: Body Condition Score dokumentieren", impact: "+4%" },
              { tip: "Wurmkur-Protokoll digital führen", impact: "+3%" },
            ].map((t) => (
              <div key={t.tip} className="flex items-start gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="flex-1">{t.tip}</div>
                <Badge variant="outline" className="text-emerald-500">{t.impact}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PortfolioView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio-Analyse</h1>
        <p className="text-sm text-muted-foreground">Überblick über Ihr Versicherungsportfolio</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Verteilung nach Typ</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={PORTFOLIO_PIE} dataKey="value" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {PORTFOLIO_PIE.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Portfolio-Kennzahlen</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Gesamtwert aller Policen", value: "4.200.000 €" },
              { label: "Durchschnittliche Prämie", value: "94,50 €/Mon" },
              { label: "Schadensquote (12 Mon.)", value: "12,3%" },
              { label: "Verlängerungsrate", value: "91,5%" },
              { label: "Neuabschlüsse (Q1)", value: "127" },
            ].map((k) => (
              <div key={k.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{k.label}</span>
                <span className="font-medium">{k.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NutzerView() {
  const users = [
    { name: "Matthias Fischer", rolle: "Admin", email: "matthias@fischer-vers.de", letzterLogin: "Heute, 14:32" },
    { name: "Sandra Lehmann", rolle: "Sachbearbeiter", email: "sandra@fischer-vers.de", letzterLogin: "Heute, 11:15" },
    { name: "Tim Köhler", rolle: "Sachbearbeiter", email: "tim@fischer-vers.de", letzterLogin: "Gestern, 16:48" },
    { name: "Laura Meier", rolle: "Viewer", email: "laura@fischer-vers.de", letzterLogin: "12.03.2025" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nutzer-Verwaltung</h1>
          <p className="text-sm text-muted-foreground">{users.length} Nutzer im Portal</p>
        </div>
        <Button>+ Nutzer einladen</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Letzter Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.email}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell><Badge variant="outline">{u.rolle}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground">{u.letzterLogin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
