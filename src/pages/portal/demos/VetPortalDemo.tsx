import { useState } from "react";
import { Stethoscope, LayoutDashboard, Users, FileText, RefreshCw, MapPin, Calendar, Syringe, Eye, Activity, Heart, MessageSquare, Link2, Globe, Briefcase, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { PortalDemoShell } from "./PortalDemoShell";
import { PferdeaktenTab, ChatTab, HMConnectTab, NutzerTab, MitarbeiterTab, LandingpageTab } from "./shared/SharedPortalTabs";
import { DEMO_PFERDE } from "./shared/DemoPortalData";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patienten", label: "Patienten", icon: Users },
  { id: "befunde", label: "SOAP-Befunde", icon: FileText },
  { id: "impfungen", label: "Impf-Management", icon: Syringe },
  { id: "pferdeakten", label: "Pferdeakten", icon: Heart },
  { id: "kollegen", label: "Kollegen", icon: Users },
  { id: "sync", label: "PMS-Sync", icon: RefreshCw },
  { id: "finder", label: "Klinik-Finder", icon: MapPin },
  { id: "nachrichten", label: "Nachrichten", icon: MessageSquare },
  { id: "connect", label: "Hufi Connect", icon: Link2 },
  { id: "mitarbeiter", label: "Mitarbeiter", icon: Briefcase },
  { id: "nutzer", label: "Nutzer", icon: Users },
  { id: "landingpage", label: "Website", icon: Globe },
];

const PATIENTEN = [
  { id: "PAT-001", name: "Amara", rasse: "Westfale", alter: "8 J.", besitzer: "Demo-Besitzer A", letzteBeh: "12.03.2025", befunde: 12, status: "gesund" },
  { id: "PAT-002", name: "Nordlicht", rasse: "Hannoveraner", alter: "12 J.", besitzer: "Demo-Besitzer B", letzteBeh: "08.03.2025", befunde: 8, status: "in_behandlung" },
  { id: "PAT-003", name: "Windstoß", rasse: "Trakehner", alter: "6 J.", besitzer: "Demo-Besitzer C", letzteBeh: "01.03.2025", befunde: 5, status: "gesund" },
  { id: "PAT-004", name: "Pfeffer", rasse: "Isländer", alter: "15 J.", besitzer: "Demo-Besitzer D", letzteBeh: "28.02.2025", befunde: 22, status: "chronisch" },
  { id: "PAT-005", name: "Schattenspiel", rasse: "Friese", alter: "10 J.", besitzer: "Demo-Besitzer E", letzteBeh: "15.03.2025", befunde: 3, status: "gesund" },
  { id: "PAT-006", name: "Goldstaub", rasse: "Haflinger", alter: "14 J.", besitzer: "Demo-Besitzer F", letzteBeh: "10.03.2025", befunde: 17, status: "in_behandlung" },
];

const BEFUNDE = [
  { id: "B-001", pferd: "Nordlicht", datum: "08.03.2025", typ: "Lahmheitsuntersuchung", tierarzt: "Demo-Tierärztin A", s: "Lahmheit vorne links Grad 2/5", o: "Druckschmerz Hufgelenk, pos. Beugeprobe", a: "V.a. Hufgelenksentzündung", p: "Röntgen, Hufgelenksinjektion" },
  { id: "B-002", pferd: "Amara", datum: "12.03.2025", typ: "Impfung + Kontrolle", tierarzt: "Demo-Tierärztin A", s: "Jährliche Kontrolle, Besitzer meldet guten AZ", o: "Alle Vitalwerte im Normbereich", a: "Gesund, Impfung fällig", p: "Influenza-Impfung verabreicht, Kontrolle in 6 Mon." },
  { id: "B-003", pferd: "Pfeffer", datum: "28.02.2025", typ: "Huf-Rehe Kontrolle", tierarzt: "Demo-Tierarzt B", s: "Chronische Rehe, aktuell stabil", o: "Keine Pulsation, Hufbearbeitung vor 3 Wochen", a: "Stabile chronische Hufrehe", p: "Weiter Diät, nächste Kontrolle in 4 Wochen" },
  { id: "B-004", pferd: "Goldstaub", datum: "10.03.2025", typ: "Zahnbehandlung", tierarzt: "Demo-Tierärztin A", s: "Futterverweigerung seit 3 Tagen", o: "Scharfe Kanten M2-M4, Ulzeration Backenschleimhaut", a: "Zahnhaken mit Schleimhautläsion", p: "Zahnkorrektur durchgeführt, Kontrolle in 14 Tagen" },
];

const KOLLEGEN = [
  { id: "K-01", name: "Demo-Tierärztin A", spezial: "Orthopädie, Chirurgie", email: "demo.vet-a@klinik-demo.de", status: "aktiv" },
  { id: "K-02", name: "Demo-Tierarzt B", spezial: "Innere Medizin, Hufrehe", email: "demo.vet-b@klinik-demo.de", status: "aktiv" },
  { id: "K-03", name: "Demo-Tierärztin C", spezial: "Zahnheilkunde", email: "demo.vet-c@klinik-demo.de", status: "aktiv" },
  { id: "K-04", name: "Demo-Tierarzt D", spezial: "Reproduktion", email: "demo.vet-d@klinik-demo.de", status: "elternzeit" },
];

const MONTHLY = [
  { month: "Sep", patienten: 38, befunde: 52 }, { month: "Okt", patienten: 42, befunde: 61 },
  { month: "Nov", patienten: 45, befunde: 58 }, { month: "Dez", patienten: 35, befunde: 42 },
  { month: "Jan", patienten: 48, befunde: 67 }, { month: "Feb", patienten: 51, befunde: 72 },
];

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    gesund: { label: "Gesund", variant: "default" },
    in_behandlung: { label: "In Behandlung", variant: "secondary" },
    chronisch: { label: "Chronisch", variant: "outline" },
  };
  const cfg = map[s] || { label: s, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

export default function VetPortalDemo() {
  const [tab, setTab] = useState("dashboard");
  const [selectedPatient, setSelectedPatient] = useState<typeof PATIENTEN[0] | null>(null);
  const [selectedBefund, setSelectedBefund] = useState<typeof BEFUNDE[0] | null>(null);
  const [showNeuBefund, setShowNeuBefund] = useState(false);

  return (
    <PortalDemoShell title="Tierarzt- & Klinik-Portal" orgName="Demo-Pferdeklinik" icon={Stethoscope} iconColor="green-400" navItems={NAV} activeTab={tab} onTabChange={setTab}>
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-muted-foreground">Praxis-Übersicht (Demo-Daten)</p></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Patienten", value: "456", icon: Users },
              { label: "SOAP-Befunde", value: "1.890", icon: FileText },
              { label: "Impfungen fällig", value: "34", icon: Syringe },
              { label: "Klinik-Score", value: "92%", icon: Activity },
            ].map((s) => (
              <Card key={s.label}><CardContent className="pt-5"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div><s.icon className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
            ))}
          </div>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Behandlungen / Monat</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MONTHLY}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Bar dataKey="befunde" fill="#10b981" radius={[4,4,0,0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </div>
      )}

      {tab === "patienten" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Patienten</h1><p className="text-sm text-muted-foreground">{PATIENTEN.length} registrierte Patienten (Demo-Daten)</p></div><Button><Plus className="h-4 w-4 mr-1" /> Patient aufnehmen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Rasse</TableHead><TableHead>Alter</TableHead><TableHead>Besitzer</TableHead><TableHead>Befunde</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {PATIENTEN.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPatient(p)}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.rasse}</TableCell><TableCell>{p.alter}</TableCell><TableCell>{p.besitzer}</TableCell><TableCell>{p.befunde}</TableCell><TableCell>{statusBadge(p.status)}</TableCell><TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "befunde" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">SOAP-Befunde</h1><p className="text-sm text-muted-foreground">{BEFUNDE.length} aktuelle Befunde (Demo-Daten)</p></div><Button onClick={() => setShowNeuBefund(true)}><Plus className="h-4 w-4 mr-1" /> Befund erstellen</Button></div>
          <div className="space-y-3">
            {BEFUNDE.map((b) => (
              <Card key={b.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelectedBefund(b)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div><span className="font-medium">{b.pferd}</span> <span className="text-muted-foreground text-sm">· {b.typ}</span></div>
                    <span className="text-xs text-muted-foreground">{b.datum} · {b.tierarzt}</span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                    <div><span className="font-semibold text-blue-500">S:</span> <span className="text-muted-foreground line-clamp-1">{b.s}</span></div>
                    <div><span className="font-semibold text-emerald-500">O:</span> <span className="text-muted-foreground line-clamp-1">{b.o}</span></div>
                    <div><span className="font-semibold text-amber-500">A:</span> <span className="text-muted-foreground line-clamp-1">{b.a}</span></div>
                    <div><span className="font-semibold text-red-500">P:</span> <span className="text-muted-foreground line-clamp-1">{b.p}</span></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "impfungen" && (
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">Impf-Management</h1><p className="text-sm text-muted-foreground">Fällige und geplante Impfungen (Demo-Daten)</p></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Pferd</TableHead><TableHead>Impfung</TableHead><TableHead>Fällig am</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {[
                { pferd: "Nordlicht", impfung: "Influenza", faellig: "20.03.2025", status: "fällig" },
                { pferd: "Windstoß", impfung: "Tetanus", faellig: "15.04.2025", status: "geplant" },
                { pferd: "Pfeffer", impfung: "Herpes", faellig: "01.04.2025", status: "fällig" },
                { pferd: "Schattenspiel", impfung: "Influenza", faellig: "28.03.2025", status: "fällig" },
                { pferd: "Goldstaub", impfung: "Tollwut", faellig: "10.05.2025", status: "geplant" },
              ].map((i,idx) => (
                <TableRow key={idx}><TableCell className="font-medium">{i.pferd}</TableCell><TableCell>{i.impfung}</TableCell><TableCell>{i.faellig}</TableCell><TableCell><Badge variant={i.status === "fällig" ? "destructive" : "outline"}>{i.status}</Badge></TableCell><TableCell><Button size="sm" variant="outline">Termin buchen</Button></TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "pferdeakten" && <PferdeaktenTab />}

      {tab === "kollegen" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Kolleg:innen</h1><p className="text-sm text-muted-foreground">{KOLLEGEN.length} Tierärzt:innen (Demo-Daten)</p></div><Button><Plus className="h-4 w-4 mr-1" /> Kollege hinzufügen</Button></div>
          <div className="grid gap-3">
            {KOLLEGEN.map((k) => (
              <Card key={k.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><Stethoscope className="h-5 w-5 text-emerald-500" /></div>
                    <div><p className="font-medium">{k.name}</p><p className="text-xs text-muted-foreground">{k.spezial}</p><p className="text-xs text-muted-foreground">{k.email}</p></div>
                  </div>
                  <Badge variant={k.status === "aktiv" ? "default" : "secondary"}>{k.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground text-center">ℹ️ Alle dargestellten Personen sind fiktive Demo-Accounts.</p>
        </div>
      )}

      {tab === "sync" && (
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">PMS-Sync</h1><p className="text-sm text-muted-foreground">Praxis-Management-System Synchronisation</p></div>
          <Card><CardContent className="pt-6 text-center space-y-3">
            <RefreshCw className="h-12 w-12 text-primary mx-auto" />
            <p className="font-medium">Verbunden mit: Demo-PMS System</p>
            <p className="text-sm text-muted-foreground">Letzter Sync: Heute, 14:32 · 456 Patienten synchronisiert</p>
            <div className="flex gap-2 justify-center"><Button>Jetzt synchronisieren</Button><Button variant="outline">Einstellungen</Button></div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Unterstützte Systeme</CardTitle></CardHeader><CardContent className="space-y-2">
            {["ezyVet (OAuth2)", "Provet Cloud", "Vetera", "HippoManager"].map(s => (
              <div key={s} className="flex items-center justify-between py-2 border-b last:border-0 text-sm"><span>{s}</span><Badge variant="outline">Verfügbar</Badge></div>
            ))}
          </CardContent></Card>
        </div>
      )}

      {tab === "finder" && (
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">Klinik-Finder</h1><p className="text-sm text-muted-foreground">Ihre Praxis im HufManager-Netzwerk</p></div>
          <Card><CardContent className="pt-6">
            {/* OpenStreetMap Embed */}
            <div className="aspect-[16/9] rounded-lg overflow-hidden border">
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=7.55%2C51.92%2C7.68%2C51.98&layer=mapnik&marker=51.9607%2C7.6261"
                className="w-full h-full border-0"
                title="Klinik-Standort"
                loading="lazy"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Adresse:</span><p className="font-medium">Demo-Straße 12, 48163 Demo-Stadt</p></div>
              <div><span className="text-muted-foreground">Öffnungszeiten:</span><p className="font-medium">Mo-Fr 8:00-18:00, Sa 9:00-13:00</p></div>
              <div><span className="text-muted-foreground">Notdienst:</span><p className="font-medium">24/7 erreichbar</p></div>
              <div><span className="text-muted-foreground">Profil-Aufrufe:</span><p className="font-medium">342 / Monat</p></div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline">Profil bearbeiten</Button>
              <Button size="sm" variant="outline">Spezialisierungen verwalten</Button>
              <Button size="sm" variant="outline">Notdienst-Zeiten</Button>
            </div>
          </CardContent></Card>
        </div>
      )}

      {tab === "nachrichten" && <ChatTab />}
      {tab === "connect" && <HMConnectTab />}
      {tab === "mitarbeiter" && <MitarbeiterTab orgDomain="demo-klinik.de" />}
      {tab === "nutzer" && <NutzerTab orgDomain="demo-klinik.de" />}
      {tab === "landingpage" && <LandingpageTab orgName="Demo-Pferdeklinik" />}

      {/* Patient Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent><DialogHeader><DialogTitle>{selectedPatient?.name}</DialogTitle><DialogDescription>{selectedPatient?.rasse} · {selectedPatient?.alter} · {selectedPatient?.besitzer}</DialogDescription></DialogHeader>
          {selectedPatient && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Letzte Behandlung:</span> <span className="font-medium">{selectedPatient.letzteBeh}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(selectedPatient.status)}</div>
                <div><span className="text-muted-foreground">Befunde gesamt:</span> <span className="font-medium">{selectedPatient.befunde}</span></div>
              </div>
              <div className="flex gap-2 pt-2"><Button size="sm">Befund erstellen</Button><Button size="sm" variant="outline">Pferdeakte öffnen</Button><Button size="sm" variant="outline">Termin</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Befund Dialog */}
      <Dialog open={!!selectedBefund} onOpenChange={() => setSelectedBefund(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>SOAP-Befund {selectedBefund?.id}</DialogTitle><DialogDescription>{selectedBefund?.pferd} · {selectedBefund?.typ} · {selectedBefund?.datum}</DialogDescription></DialogHeader>
          {selectedBefund && (
            <div className="space-y-3 text-sm">
              <div className="space-y-2">
                <div><span className="font-semibold text-blue-500">Subjektiv (S):</span><p className="text-muted-foreground mt-0.5">{selectedBefund.s}</p></div>
                <div><span className="font-semibold text-emerald-500">Objektiv (O):</span><p className="text-muted-foreground mt-0.5">{selectedBefund.o}</p></div>
                <div><span className="font-semibold text-amber-500">Assessment (A):</span><p className="text-muted-foreground mt-0.5">{selectedBefund.a}</p></div>
                <div><span className="font-semibold text-red-500">Plan (P):</span><p className="text-muted-foreground mt-0.5">{selectedBefund.p}</p></div>
              </div>
              <p className="text-xs text-muted-foreground">Tierarzt: {selectedBefund.tierarzt}</p>
              <div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Bearbeiten</Button><Button size="sm" variant="outline">PDF Export</Button><Button size="sm" variant="outline">In Akte übernehmen</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Neuer Befund Dialog */}
      <Dialog open={showNeuBefund} onOpenChange={setShowNeuBefund}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Neuen SOAP-Befund erstellen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Patient</label><Select><SelectTrigger><SelectValue placeholder="Pferd wählen" /></SelectTrigger><SelectContent>{PATIENTEN.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-sm font-medium">Befund-Typ</label><Select><SelectTrigger><SelectValue placeholder="Typ" /></SelectTrigger><SelectContent><SelectItem value="kontrolle">Kontrolle</SelectItem><SelectItem value="lahmheit">Lahmheit</SelectItem><SelectItem value="impfung">Impfung</SelectItem><SelectItem value="zahn">Zahnbehandlung</SelectItem><SelectItem value="notfall">Notfall</SelectItem></SelectContent></Select></div>
            </div>
            <div><label className="text-sm font-medium text-blue-500">S – Subjektiv</label><Textarea placeholder="Anamnese, Vorbericht…" rows={2} /></div>
            <div><label className="text-sm font-medium text-emerald-500">O – Objektiv</label><Textarea placeholder="Befunde, Messwerte…" rows={2} /></div>
            <div><label className="text-sm font-medium text-amber-500">A – Assessment</label><Textarea placeholder="Diagnose, Beurteilung…" rows={2} /></div>
            <div><label className="text-sm font-medium text-red-500">P – Plan</label><Textarea placeholder="Therapie, nächste Schritte…" rows={2} /></div>
            <Button className="w-full" onClick={() => setShowNeuBefund(false)}>Befund speichern</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PortalDemoShell>
  );
}
