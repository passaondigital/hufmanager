import { useState } from "react";
import { Landmark, LayoutDashboard, Users, Award, BookOpen, Calendar, BarChart3, Eye, CheckCircle, FileText, Heart, MessageSquare, Link2, Globe, Briefcase, Plus, GraduationCap, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { PortalDemoShell } from "./PortalDemoShell";
import { PferdeaktenTab, ChatTab, HMConnectTab, NutzerTab, MitarbeiterTab, LandingpageTab } from "./shared/SharedPortalTabs";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "mitglieder", label: "Mitglieder", icon: Users },
  { id: "zertifikate", label: "Zertifizierung", icon: Award },
  { id: "ausbildung", label: "Ausbildung", icon: GraduationCap },
  { id: "standards", label: "Standards", icon: BookOpen },
  { id: "events", label: "Events", icon: Calendar },
  { id: "statistiken", label: "Statistiken", icon: BarChart3 },
  { id: "pferdeakten", label: "Pferdeakten", icon: Heart },
  { id: "nachrichten", label: "Nachrichten", icon: MessageSquare },
  { id: "connect", label: "HM Connect", icon: Link2 },
  { id: "personal", label: "Mitarbeiter", icon: Briefcase },
  { id: "nutzer", label: "Nutzer", icon: Users },
  { id: "landingpage", label: "Website", icon: Globe },
];

const MITGLIEDER = [
  { id: "M-001", name: "Demo-Hufschmied A", ort: "Demo-Stadt A", mitglied_seit: "2018", typ: "Hufschmied", zertifiziert: true, beitrag: "bezahlt", email: "demo.schmied-a@verband-demo.de" },
  { id: "M-002", name: "Demo-Hufpfleger B", ort: "Demo-Stadt B", mitglied_seit: "2020", typ: "Hufpfleger", zertifiziert: true, beitrag: "bezahlt", email: "demo.pfleger-b@verband-demo.de" },
  { id: "M-003", name: "Demo-Hufschmied C", ort: "Demo-Stadt C", mitglied_seit: "2015", typ: "Hufschmied", zertifiziert: true, beitrag: "bezahlt", email: "demo.schmied-c@verband-demo.de" },
  { id: "M-004", name: "Demo-Hufpfleger D", ort: "Demo-Stadt D", mitglied_seit: "2021", typ: "Hufpfleger", zertifiziert: false, beitrag: "offen", email: "demo.pfleger-d@verband-demo.de" },
  { id: "M-005", name: "Demo-Hufschmied E", ort: "Demo-Stadt E", mitglied_seit: "2019", typ: "Hufschmied", zertifiziert: true, beitrag: "bezahlt", email: "demo.schmied-e@verband-demo.de" },
  { id: "M-006", name: "Demo-Huforthopäde F", ort: "Demo-Stadt F", mitglied_seit: "2022", typ: "Huforthopäde", zertifiziert: true, beitrag: "bezahlt", email: "demo.ortho-f@verband-demo.de" },
  { id: "M-007", name: "Demo-Auszubildender G", ort: "Demo-Stadt G", mitglied_seit: "2023", typ: "Hufpfleger", zertifiziert: false, beitrag: "offen", email: "demo.azubi-g@verband-demo.de" },
];

const STANDARDS = [
  { id: "STD-01", titel: "Leitfaden Barhufbearbeitung", version: "3.2", aktualisiert: "Jan 2025", downloads: 892 },
  { id: "STD-02", titel: "Qualitätsstandard Beschlagtechnik", version: "2.1", aktualisiert: "Nov 2024", downloads: 645 },
  { id: "STD-03", titel: "Hygiene-Richtlinien Hufbearbeitung", version: "1.5", aktualisiert: "Sep 2024", downloads: 1230 },
  { id: "STD-04", titel: "Ausbildungsrahmenplan Hufpflege", version: "4.0", aktualisiert: "Mär 2025", downloads: 456 },
  { id: "STD-05", titel: "Tierschutz-Leitfaden", version: "2.0", aktualisiert: "Jun 2024", downloads: 2100 },
];

const EVENTS = [
  { id: "EV-01", name: "Jahrestagung 2025", datum: "12.-14.06.2025", ort: "Demo-Tagungsort", teilnehmer: 240, status: "anmeldung_offen", preis: "290 €" },
  { id: "EV-02", name: "Fortbildung: Orthopädischer Beschlag", datum: "15.04.2025", ort: "Demo-Schulungszentrum", teilnehmer: 35, status: "anmeldung_offen", preis: "180 €" },
  { id: "EV-03", name: "Regionaltreff Nord", datum: "22.03.2025", ort: "Demo-Stadt A", teilnehmer: 45, status: "ausgebucht", preis: "kostenlos" },
  { id: "EV-04", name: "Webinar: Digitale Dokumentation", datum: "10.04.2025", ort: "Online", teilnehmer: 120, status: "anmeldung_offen", preis: "49 €" },
  { id: "EV-05", name: "Meisterprüfung Q2", datum: "20.-22.05.2025", ort: "Demo-Prüfzentrum", teilnehmer: 18, status: "anmeldung_offen", preis: "450 €" },
];

const AUSBILDUNG = [
  { id: "AB-01", name: "Grundkurs Hufpflege", dauer: "6 Monate", teilnehmer: 24, start: "01.09.2025", plaetze: 30, status: "offen" },
  { id: "AB-02", name: "Aufbaukurs Beschlagtechnik", dauer: "12 Monate", teilnehmer: 18, start: "01.04.2025", plaetze: 20, status: "fast_voll" },
  { id: "AB-03", name: "Spezialisierung Huforthopädie", dauer: "18 Monate", teilnehmer: 8, start: "01.10.2025", plaetze: 12, status: "offen" },
  { id: "AB-04", name: "Meistervorbereitung", dauer: "3 Monate", teilnehmer: 15, start: "01.03.2025", plaetze: 15, status: "voll" },
];

const MEMBER_PIE = [
  { name: "Hufschmied", value: 520, color: "#3b82f6" },
  { name: "Hufpfleger", value: 380, color: "#10b981" },
  { name: "Huforthopäde", value: 180, color: "#f59e0b" },
  { name: "Auszubildend", value: 165, color: "#8b5cf6" },
];

const GROWTH = [
  { year: "2020", mitglieder: 890 }, { year: "2021", mitglieder: 980 },
  { year: "2022", mitglieder: 1050 }, { year: "2023", mitglieder: 1120 },
  { year: "2024", mitglieder: 1190 }, { year: "2025", mitglieder: 1245 },
];

export default function AssociationPortalDemo() {
  const [tab, setTab] = useState("dashboard");
  const [selectedMitglied, setSelectedMitglied] = useState<typeof MITGLIEDER[0] | null>(null);
  const [showNeuesMitglied, setShowNeuesMitglied] = useState(false);
  const [showNeuesEvent, setShowNeuesEvent] = useState(false);

  return (
    <PortalDemoShell title="Verbands-Portal" orgName="Demo-Hufbearbeiter-Verband e.V." icon={Landmark} iconColor="cyan-400" navItems={NAV} activeTab={tab} onTabChange={setTab}>
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-muted-foreground">Verbands-Übersicht (Demo-Daten)</p></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Mitglieder", value: "1.245", icon: Users },
              { label: "Zertifikate", value: "456", icon: Award },
              { label: "Standards", value: "12", icon: BookOpen },
              { label: "Events 2025", value: "8", icon: Calendar },
            ].map((s) => (
              <Card key={s.label}><CardContent className="pt-5"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div><s.icon className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">Mitglieder nach Typ</CardTitle></CardHeader><CardContent>
              <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={MEMBER_PIE} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>{MEMBER_PIE.map((e) => <Cell key={e.name} fill={e.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">Nächste Events</CardTitle></CardHeader><CardContent className="space-y-3">
              {EVENTS.slice(0, 3).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm border rounded-lg p-3"><div><p className="font-medium">{e.name}</p><p className="text-xs text-muted-foreground">{e.datum} · {e.ort}</p></div><Badge variant={e.status === "ausgebucht" ? "secondary" : "outline"}>{e.status === "ausgebucht" ? "Ausgebucht" : "Offen"}</Badge></div>
              ))}
            </CardContent></Card>
          </div>
        </div>
      )}

      {tab === "mitglieder" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Mitglieder</h1><p className="text-sm text-muted-foreground">{MITGLIEDER.length} Mitglieder (Demo-Daten)</p></div><Button onClick={() => setShowNeuesMitglied(true)}><Plus className="h-4 w-4 mr-1" /> Mitglied aufnehmen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Ort</TableHead><TableHead>Typ</TableHead><TableHead>E-Mail</TableHead><TableHead>Seit</TableHead><TableHead>Zertifiziert</TableHead><TableHead>Beitrag</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {MITGLIEDER.map((m) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedMitglied(m)}>
                  <TableCell className="font-medium">{m.name}</TableCell><TableCell>{m.ort}</TableCell><TableCell><Badge variant="outline">{m.typ}</Badge></TableCell><TableCell className="text-muted-foreground text-xs">{m.email}</TableCell><TableCell>{m.mitglied_seit}</TableCell>
                  <TableCell>{m.zertifiziert ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <span className="text-muted-foreground">–</span>}</TableCell>
                  <TableCell><Badge variant={m.beitrag === "bezahlt" ? "default" : "destructive"}>{m.beitrag}</Badge></TableCell>
                  <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
          <p className="text-[11px] text-muted-foreground text-center">ℹ️ Alle dargestellten Mitglieder sind fiktive Demo-Accounts.</p>
        </div>
      )}

      {tab === "zertifikate" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Zertifizierung</h1><p className="text-sm text-muted-foreground">Zertifikate & Prüfungen verwalten</p></div><Button><Plus className="h-4 w-4 mr-1" /> Zertifikat ausstellen</Button></div>
          <div className="grid lg:grid-cols-3 gap-4">
            {[{ label: "Aktive Zertifikate", value: "456" }, { label: "Prüfungen 2025", value: "24" }, { label: "Bestehensquote", value: "89%" }].map((m) => (
              <Card key={m.label}><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{m.value}</p><p className="text-sm text-muted-foreground mt-1">{m.label}</p></CardContent></Card>
            ))}
          </div>
          <Card><CardHeader><CardTitle className="text-base">Letzte Zertifizierungen</CardTitle></CardHeader><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Mitglied</TableHead><TableHead>Zertifikat</TableHead><TableHead>Datum</TableHead><TableHead>Gültig bis</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {[
                { name: "Demo-Hufschmied A", zert: "Geprüfter Hufschmied", datum: "15.01.2025", bis: "14.01.2028" },
                { name: "Demo-Huforthopäde F", zert: "Huforthopäde (Verband)", datum: "20.12.2024", bis: "19.12.2027" },
                { name: "Demo-Hufschmied E", zert: "Geprüfter Hufschmied", datum: "10.11.2024", bis: "09.11.2027" },
              ].map((z, i) => (
                <TableRow key={i}><TableCell className="font-medium">{z.name}</TableCell><TableCell>{z.zert}</TableCell><TableCell>{z.datum}</TableCell><TableCell>{z.bis}</TableCell><TableCell><Button size="sm" variant="outline">PDF</Button></TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "ausbildung" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Ausbildung</h1><p className="text-sm text-muted-foreground">Kurse & Lehrgänge verwalten</p></div><Button><Plus className="h-4 w-4 mr-1" /> Kurs anlegen</Button></div>
          <div className="space-y-3">
            {AUSBILDUNG.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div><h3 className="font-medium">{a.name}</h3><p className="text-sm text-muted-foreground">Dauer: {a.dauer} · Start: {a.start}</p>
                      <div className="flex items-center gap-2 mt-2"><Progress value={(a.teilnehmer / a.plaetze) * 100} className="h-2 w-24" /><span className="text-xs text-muted-foreground">{a.teilnehmer}/{a.plaetze} Plätze</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.status === "voll" ? "secondary" : a.status === "fast_voll" ? "outline" : "default"}>{a.status === "voll" ? "Ausgebucht" : a.status === "fast_voll" ? "Fast voll" : "Plätze frei"}</Badge>
                      <Button size="sm" variant="outline">Verwalten</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "standards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Standards & Leitfäden</h1></div><Button><Plus className="h-4 w-4 mr-1" /> Standard erstellen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Titel</TableHead><TableHead>Version</TableHead><TableHead>Aktualisiert</TableHead><TableHead>Downloads</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {STANDARDS.map((s) => (
                <TableRow key={s.id}><TableCell className="font-medium">{s.titel}</TableCell><TableCell><Badge variant="outline">v{s.version}</Badge></TableCell><TableCell>{s.aktualisiert}</TableCell><TableCell>{s.downloads}</TableCell><TableCell><Button size="sm" variant="outline"><FileText className="h-3 w-3 mr-1" />PDF</Button></TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "events" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Events</h1></div><Button onClick={() => setShowNeuesEvent(true)}><Plus className="h-4 w-4 mr-1" /> Event planen</Button></div>
          <div className="space-y-3">
            {EVENTS.map((e) => (
              <Card key={e.id}><CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div><h3 className="font-medium">{e.name}</h3><p className="text-sm text-muted-foreground">{e.datum} · {e.ort}</p><p className="text-xs text-muted-foreground mt-1">{e.teilnehmer} Teilnehmer · {e.preis}</p></div>
                  <div className="flex gap-2"><Badge variant={e.status === "ausgebucht" ? "secondary" : "outline"}>{e.status === "ausgebucht" ? "Ausgebucht" : "Anmeldung offen"}</Badge><Button size="sm" variant="outline">Verwalten</Button></div>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </div>
      )}

      {tab === "statistiken" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Statistiken</h1><p className="text-sm text-muted-foreground">Verbandsentwicklung & Kennzahlen (Demo-Daten)</p></div>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Mitglieder-Entwicklung</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={250}><BarChart data={GROWTH}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="year" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Bar dataKey="mitglieder" fill="#06b6d4" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
          </CardContent></Card>
          <div className="grid lg:grid-cols-3 gap-4">
            {[{ label: "Ø Mitgliedsdauer", value: "5,2 Jahre" }, { label: "Beitragsquote", value: "94%" }, { label: "Wachstum YoY", value: "+4,6%" }].map((m) => (
              <Card key={m.label}><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{m.value}</p><p className="text-sm text-muted-foreground mt-1">{m.label}</p></CardContent></Card>
            ))}
          </div>
        </div>
      )}

      {tab === "pferdeakten" && <PferdeaktenTab />}
      {tab === "nachrichten" && <ChatTab />}
      {tab === "connect" && <HMConnectTab />}
      {tab === "personal" && <MitarbeiterTab orgDomain="demo-verband.de" />}
      {tab === "nutzer" && <NutzerTab orgDomain="demo-verband.de" />}
      {tab === "landingpage" && <LandingpageTab orgName="Demo-Hufbearbeiter-Verband e.V." />}

      {/* Mitglied Dialog */}
      <Dialog open={!!selectedMitglied} onOpenChange={() => setSelectedMitglied(null)}>
        <DialogContent><DialogHeader><DialogTitle>{selectedMitglied?.name}</DialogTitle><DialogDescription>{selectedMitglied?.typ} · Mitglied seit {selectedMitglied?.mitglied_seit}</DialogDescription></DialogHeader>
          {selectedMitglied && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Ort:</span> <span className="font-medium">{selectedMitglied.ort}</span></div>
                <div><span className="text-muted-foreground">E-Mail:</span> <span className="font-medium">{selectedMitglied.email}</span></div>
                <div><span className="text-muted-foreground">Zertifiziert:</span> <span className="font-medium">{selectedMitglied.zertifiziert ? "Ja ✓" : "Nein"}</span></div>
                <div><span className="text-muted-foreground">Beitrag:</span> <Badge variant={selectedMitglied.beitrag === "bezahlt" ? "default" : "destructive"}>{selectedMitglied.beitrag}</Badge></div>
              </div>
              <div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Profil bearbeiten</Button><Button size="sm" variant="outline">Zertifikat ausstellen</Button><Button size="sm" variant="outline"><Mail className="h-3 w-3 mr-1" />Kontakt</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Neues Mitglied */}
      <Dialog open={showNeuesMitglied} onOpenChange={setShowNeuesMitglied}>
        <DialogContent><DialogHeader><DialogTitle>Mitglied aufnehmen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3"><Input placeholder="Name" /><Input placeholder="E-Mail" /></div>
            <div className="grid grid-cols-2 gap-3"><Input placeholder="Ort" /><Select><SelectTrigger><SelectValue placeholder="Typ" /></SelectTrigger><SelectContent><SelectItem value="hufschmied">Hufschmied</SelectItem><SelectItem value="hufpfleger">Hufpfleger</SelectItem><SelectItem value="huforthopäde">Huforthopäde</SelectItem><SelectItem value="azubi">Auszubildend</SelectItem></SelectContent></Select></div>
            <Textarea placeholder="Anmerkungen…" rows={2} />
            <Button className="w-full" onClick={() => setShowNeuesMitglied(false)}>Mitglied aufnehmen</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Neues Event */}
      <Dialog open={showNeuesEvent} onOpenChange={setShowNeuesEvent}>
        <DialogContent><DialogHeader><DialogTitle>Event planen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Event-Name" />
            <div className="grid grid-cols-2 gap-3"><Input placeholder="Datum" type="date" /><Input placeholder="Ort" /></div>
            <div className="grid grid-cols-2 gap-3"><Input placeholder="Max. Teilnehmer" type="number" /><Input placeholder="Preis (€ netto)" /></div>
            <Textarea placeholder="Beschreibung…" rows={3} />
            <Button className="w-full" onClick={() => setShowNeuesEvent(false)}>Event erstellen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PortalDemoShell>
  );
}
