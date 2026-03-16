import { useState } from "react";
import { Landmark, LayoutDashboard, Users, Award, BookOpen, Calendar, BarChart3, Eye, CheckCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { PortalDemoShell } from "./PortalDemoShell";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "mitglieder", label: "Mitglieder", icon: Users },
  { id: "zertifikate", label: "Zertifizierung", icon: Award },
  { id: "standards", label: "Standards", icon: BookOpen },
  { id: "events", label: "Events", icon: Calendar },
  { id: "statistiken", label: "Statistiken", icon: BarChart3 },
];

const MITGLIEDER = [
  { id: "M-001", name: "Stefan Bergmann", ort: "Hamburg", mitglied_seit: "2018", typ: "Hufschmied", zertifiziert: true, beitrag: "bezahlt" },
  { id: "M-002", name: "Maria Klein", ort: "München", mitglied_seit: "2020", typ: "Hufpfleger", zertifiziert: true, beitrag: "bezahlt" },
  { id: "M-003", name: "Jürgen Wolff", ort: "Hannover", mitglied_seit: "2015", typ: "Hufschmied", zertifiziert: true, beitrag: "bezahlt" },
  { id: "M-004", name: "Heike Roth", ort: "Köln", mitglied_seit: "2021", typ: "Hufpfleger", zertifiziert: false, beitrag: "offen" },
  { id: "M-005", name: "Andreas Bauer", ort: "Berlin", mitglied_seit: "2019", typ: "Hufschmied", zertifiziert: true, beitrag: "bezahlt" },
  { id: "M-006", name: "Tanja Schulz", ort: "Stuttgart", mitglied_seit: "2022", typ: "Huforthopäde", zertifiziert: true, beitrag: "bezahlt" },
  { id: "M-007", name: "Felix Braun", ort: "Frankfurt", mitglied_seit: "2023", typ: "Hufpfleger", zertifiziert: false, beitrag: "offen" },
];

const STANDARDS = [
  { id: "STD-01", titel: "Leitfaden Barhufbearbeitung", version: "3.2", aktualisiert: "Jan 2025", downloads: 892 },
  { id: "STD-02", titel: "Qualitätsstandard Beschlagtechnik", version: "2.1", aktualisiert: "Nov 2024", downloads: 645 },
  { id: "STD-03", titel: "Hygiene-Richtlinien Hufbearbeitung", version: "1.5", aktualisiert: "Sep 2024", downloads: 1230 },
  { id: "STD-04", titel: "Ausbildungsrahmenplan Hufpflege", version: "4.0", aktualisiert: "Mär 2025", downloads: 456 },
  { id: "STD-05", titel: "Tierschutz-Leitfaden", version: "2.0", aktualisiert: "Jun 2024", downloads: 2100 },
];

const EVENTS = [
  { id: "EV-01", name: "Jahrestagung 2025", datum: "12.-14.06.2025", ort: "Warendorf", teilnehmer: 240, status: "anmeldung_offen" },
  { id: "EV-02", name: "Fortbildung: Orthopädischer Beschlag", datum: "15.04.2025", ort: "Dülmen", teilnehmer: 35, status: "anmeldung_offen" },
  { id: "EV-03", name: "Regionaltreff Nord", datum: "22.03.2025", ort: "Hamburg", teilnehmer: 45, status: "ausgebucht" },
  { id: "EV-04", name: "Webinar: Digitale Dokumentation", datum: "10.04.2025", ort: "Online", teilnehmer: 120, status: "anmeldung_offen" },
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

  return (
    <PortalDemoShell title="Verbands-Portal" orgName="DHG – Deutsche Hufschmiede-Gesellschaft" icon={Landmark} iconColor="cyan-400" navItems={NAV} activeTab={tab} onTabChange={setTab}>
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-muted-foreground">Verbands-Übersicht</p></div>
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
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={MEMBER_PIE} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {MEMBER_PIE.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">Nächste Events</CardTitle></CardHeader><CardContent className="space-y-3">
              {EVENTS.slice(0, 3).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm border rounded-lg p-3">
                  <div><p className="font-medium">{e.name}</p><p className="text-xs text-muted-foreground">{e.datum} · {e.ort}</p></div>
                  <Badge variant={e.status === "ausgebucht" ? "secondary" : "outline"}>{e.status === "ausgebucht" ? "Ausgebucht" : "Offen"}</Badge>
                </div>
              ))}
            </CardContent></Card>
          </div>
        </div>
      )}

      {tab === "mitglieder" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Mitglieder</h1><p className="text-sm text-muted-foreground">{MITGLIEDER.length} Mitglieder (Demo)</p></div><Button>+ Mitglied aufnehmen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Ort</TableHead><TableHead>Typ</TableHead><TableHead>Seit</TableHead><TableHead>Zertifiziert</TableHead><TableHead>Beitrag</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {MITGLIEDER.map((m) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedMitglied(m)}>
                  <TableCell className="font-medium">{m.name}</TableCell><TableCell>{m.ort}</TableCell><TableCell><Badge variant="outline">{m.typ}</Badge></TableCell><TableCell>{m.mitglied_seit}</TableCell>
                  <TableCell>{m.zertifiziert ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <span className="text-muted-foreground">–</span>}</TableCell>
                  <TableCell><Badge variant={m.beitrag === "bezahlt" ? "default" : "destructive"}>{m.beitrag}</Badge></TableCell>
                  <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "zertifikate" && (
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">Zertifizierung</h1><p className="text-sm text-muted-foreground">Zertifikate & Prüfungen verwalten</p></div>
          <div className="grid lg:grid-cols-3 gap-4">
            {[{ label: "Aktive Zertifikate", value: "456" }, { label: "Prüfungen 2025", value: "24" }, { label: "Bestehensquote", value: "89%" }].map((m) => (
              <Card key={m.label}><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{m.value}</p><p className="text-sm text-muted-foreground mt-1">{m.label}</p></CardContent></Card>
            ))}
          </div>
          <Card><CardHeader><CardTitle className="text-base">Letzte Zertifizierungen</CardTitle></CardHeader><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Mitglied</TableHead><TableHead>Zertifikat</TableHead><TableHead>Datum</TableHead><TableHead>Gültig bis</TableHead></TableRow></TableHeader><TableBody>
              {[
                { name: "Stefan Bergmann", zert: "Geprüfter Hufschmied (DHG)", datum: "15.01.2025", bis: "14.01.2028" },
                { name: "Tanja Schulz", zert: "Huforthopäde (DHG)", datum: "20.12.2024", bis: "19.12.2027" },
                { name: "Andreas Bauer", zert: "Geprüfter Hufschmied (DHG)", datum: "10.11.2024", bis: "09.11.2027" },
              ].map((z, i) => (
                <TableRow key={i}><TableCell className="font-medium">{z.name}</TableCell><TableCell>{z.zert}</TableCell><TableCell>{z.datum}</TableCell><TableCell>{z.bis}</TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "standards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Standards & Leitfäden</h1></div><Button>+ Standard erstellen</Button></div>
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
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Events</h1></div><Button>+ Event planen</Button></div>
          <div className="space-y-3">
            {EVENTS.map((e) => (
              <Card key={e.id}><CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div><h3 className="font-medium">{e.name}</h3><p className="text-sm text-muted-foreground">{e.datum} · {e.ort}</p><p className="text-xs text-muted-foreground mt-1">{e.teilnehmer} Teilnehmer</p></div>
                  <div className="flex gap-2"><Badge variant={e.status === "ausgebucht" ? "secondary" : "outline"}>{e.status === "ausgebucht" ? "Ausgebucht" : "Anmeldung offen"}</Badge><Button size="sm" variant="outline">Verwalten</Button></div>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </div>
      )}

      {tab === "statistiken" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Statistiken</h1><p className="text-sm text-muted-foreground">Verbandsentwicklung & Kennzahlen</p></div>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Mitglieder-Entwicklung</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={GROWTH}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="year" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Bar dataKey="mitglieder" fill="#06b6d4" radius={[4,4,0,0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
          <div className="grid lg:grid-cols-3 gap-4">
            {[{ label: "Ø Mitgliedsdauer", value: "5,2 Jahre" }, { label: "Beitragsquote", value: "94%" }, { label: "Wachstum YoY", value: "+4,6%" }].map((m) => (
              <Card key={m.label}><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{m.value}</p><p className="text-sm text-muted-foreground mt-1">{m.label}</p></CardContent></Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!selectedMitglied} onOpenChange={() => setSelectedMitglied(null)}>
        <DialogContent><DialogHeader><DialogTitle>{selectedMitglied?.name}</DialogTitle><DialogDescription>{selectedMitglied?.typ} · Mitglied seit {selectedMitglied?.mitglied_seit}</DialogDescription></DialogHeader>
          {selectedMitglied && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Ort:</span> <span className="font-medium">{selectedMitglied.ort}</span></div>
                <div><span className="text-muted-foreground">Zertifiziert:</span> <span className="font-medium">{selectedMitglied.zertifiziert ? "Ja" : "Nein"}</span></div>
                <div><span className="text-muted-foreground">Beitrag:</span> <Badge variant={selectedMitglied.beitrag === "bezahlt" ? "default" : "destructive"}>{selectedMitglied.beitrag}</Badge></div>
              </div>
              <div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Profil bearbeiten</Button><Button size="sm" variant="outline">Zertifikat ausstellen</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalDemoShell>
  );
}
