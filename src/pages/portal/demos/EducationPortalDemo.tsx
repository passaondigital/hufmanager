import { useState } from "react";
import { GraduationCap, LayoutDashboard, BookOpen, Users, FileCheck, Award, ClipboardList, Eye, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PortalDemoShell } from "./PortalDemoShell";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "kurse", label: "Kurse", icon: BookOpen },
  { id: "schueler", label: "Schüler", icon: Users },
  { id: "lernfaelle", label: "Lernfälle", icon: ClipboardList },
  { id: "pruefungen", label: "Prüfungen", icon: FileCheck },
  { id: "zertifikate", label: "Zertifikate", icon: Award },
];

const KURSE = [
  { id: "K-001", name: "Grundkurs Hufbearbeitung", dozent: "Prof. Hartmann", schueler: 12, start: "01.02.2025", ende: "30.06.2025", fortschritt: 45, status: "aktiv" },
  { id: "K-002", name: "Aufbaukurs Beschlagtechnik", dozent: "Meister Schneider", schueler: 8, start: "15.03.2025", ende: "15.09.2025", fortschritt: 15, status: "aktiv" },
  { id: "K-003", name: "Orthopädischer Hufbeschlag", dozent: "Dr. König", schueler: 6, start: "01.04.2025", ende: "30.11.2025", fortschritt: 0, status: "geplant" },
  { id: "K-004", name: "Hufpflege Basiskurs 2024", dozent: "Prof. Hartmann", schueler: 14, start: "01.03.2024", ende: "31.08.2024", fortschritt: 100, status: "abgeschlossen" },
];

const SCHUELER = [
  { id: "S-001", name: "Tim Becker", kurs: "Grundkurs", fortschritt: 52, note: "2,3", pruefungen: "2/4", status: "aktiv" },
  { id: "S-002", name: "Laura Hofmann", kurs: "Grundkurs", fortschritt: 68, note: "1,7", pruefungen: "3/4", status: "aktiv" },
  { id: "S-003", name: "Markus Jung", kurs: "Grundkurs", fortschritt: 41, note: "2,8", pruefungen: "2/4", status: "aktiv" },
  { id: "S-004", name: "Sarah Koch", kurs: "Aufbaukurs", fortschritt: 22, note: "1,5", pruefungen: "1/3", status: "aktiv" },
  { id: "S-005", name: "Felix Braun", kurs: "Aufbaukurs", fortschritt: 18, note: "2,1", pruefungen: "1/3", status: "aktiv" },
  { id: "S-006", name: "Nina Vogel", kurs: "Grundkurs", fortschritt: 35, note: "–", pruefungen: "1/4", status: "pausiert" },
];

const LERNFAELLE = [
  { id: "LF-001", titel: "Huf-Rehe: Akutversorgung & Beschlag", pferd: "Demo-Pferd Pepper", schwierigkeit: "Fortgeschritten", bearbeitet: 18, bewertung: "4,5/5" },
  { id: "LF-002", titel: "Stellungskorrektur Fohlen", pferd: "Demo-Fohlen Star", schwierigkeit: "Mittel", bearbeitet: 12, bewertung: "4,2/5" },
  { id: "LF-003", titel: "Trachtenkorrektur Sportpferd", pferd: "Demo-Pferd Luna", schwierigkeit: "Fortgeschritten", bearbeitet: 8, bewertung: "4,7/5" },
  { id: "LF-004", titel: "Barhuf-Umstellung nach Beschlag", pferd: "Demo-Pferd Shadow", schwierigkeit: "Basis", bearbeitet: 22, bewertung: "4,1/5" },
];

const PRUEFUNGEN = [
  { id: "PR-001", titel: "Zwischenprüfung Grundkurs", kurs: "Grundkurs", datum: "15.04.2025", teilnehmer: 12, typ: "Praktisch + Theorie", status: "geplant" },
  { id: "PR-002", titel: "Praktische Prüfung Aufbaukurs", kurs: "Aufbaukurs", datum: "20.05.2025", teilnehmer: 8, typ: "Praktisch", status: "geplant" },
  { id: "PR-003", titel: "Abschlussprüfung Basiskurs 2024", kurs: "Basiskurs 2024", datum: "28.08.2024", teilnehmer: 14, typ: "Gesamt", status: "abgeschlossen" },
];

export default function EducationPortalDemo() {
  const [tab, setTab] = useState("dashboard");
  const [selectedKurs, setSelectedKurs] = useState<typeof KURSE[0] | null>(null);
  const [selectedSchueler, setSelectedSchueler] = useState<typeof SCHUELER[0] | null>(null);

  return (
    <PortalDemoShell title="Ausbildungs-Portal" orgName="DHG Hufschule Dülmen" icon={GraduationCap} iconColor="yellow-400" navItems={NAV} activeTab={tab} onTabChange={setTab}>
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-muted-foreground">Ausbildungs-Übersicht</p></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Aktive Kurse", value: "4", icon: BookOpen },
              { label: "Schüler", value: "28", icon: Users },
              { label: "Lernfälle", value: "12", icon: ClipboardList },
              { label: "Prüfungen", value: "3", icon: FileCheck },
            ].map((s) => (
              <Card key={s.label}><CardContent className="pt-5"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div><s.icon className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">Aktive Kurse</CardTitle></CardHeader><CardContent className="space-y-3">
              {KURSE.filter(k => k.status === "aktiv").map((k) => (
                <div key={k.id} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="font-medium">{k.name}</span><span className="text-muted-foreground">{k.fortschritt}%</span></div>
                  <Progress value={k.fortschritt} className="h-2" />
                  <p className="text-xs text-muted-foreground">{k.schueler} Schüler · {k.dozent}</p>
                </div>
              ))}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Anstehende Prüfungen</CardTitle></CardHeader><CardContent className="space-y-3">
              {PRUEFUNGEN.filter(p => p.status === "geplant").map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border rounded-lg p-3">
                  <div><p className="font-medium">{p.titel}</p><p className="text-xs text-muted-foreground">{p.datum} · {p.teilnehmer} Teilnehmer</p></div>
                  <Badge variant="outline">{p.typ}</Badge>
                </div>
              ))}
            </CardContent></Card>
          </div>
        </div>
      )}

      {tab === "kurse" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Kurse</h1></div><Button>+ Kurs anlegen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Kurs</TableHead><TableHead>Dozent</TableHead><TableHead>Schüler</TableHead><TableHead>Zeitraum</TableHead><TableHead>Fortschritt</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {KURSE.map((k) => (
                <TableRow key={k.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedKurs(k)}>
                  <TableCell className="font-medium">{k.name}</TableCell><TableCell>{k.dozent}</TableCell><TableCell>{k.schueler}</TableCell><TableCell className="text-xs">{k.start} – {k.ende}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><Progress value={k.fortschritt} className="h-2 w-16" /><span className="text-xs">{k.fortschritt}%</span></div></TableCell>
                  <TableCell><Badge variant={k.status === "aktiv" ? "default" : k.status === "geplant" ? "outline" : "secondary"}>{k.status}</Badge></TableCell>
                  <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "schueler" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Schüler</h1><p className="text-sm text-muted-foreground">{SCHUELER.length} Schüler</p></div><Button>+ Schüler aufnehmen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Kurs</TableHead><TableHead>Fortschritt</TableHead><TableHead>Note</TableHead><TableHead>Prüfungen</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {SCHUELER.map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSchueler(s)}>
                  <TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.kurs}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><Progress value={s.fortschritt} className="h-2 w-16" /><span className="text-xs">{s.fortschritt}%</span></div></TableCell>
                  <TableCell className="font-medium">{s.note}</TableCell><TableCell>{s.pruefungen}</TableCell>
                  <TableCell><Badge variant={s.status === "aktiv" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "lernfaelle" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Lernfälle</h1><p className="text-sm text-muted-foreground">Praxisfälle in echter Hufi-Umgebung</p></div><Button>+ Lernfall erstellen</Button></div>
          <div className="grid sm:grid-cols-2 gap-4">
            {LERNFAELLE.map((l) => (
              <Card key={l.id} className="hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between"><h3 className="font-medium text-sm">{l.titel}</h3><Badge variant="outline">{l.schwierigkeit}</Badge></div>
                  <p className="text-xs text-muted-foreground">Pferd: {l.pferd}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{l.bearbeitet}x bearbeitet</span>
                    <span>⭐ {l.bewertung}</span>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-2">Lernfall öffnen</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "pruefungen" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Prüfungen</h1></div><Button>+ Prüfung planen</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Prüfung</TableHead><TableHead>Kurs</TableHead><TableHead>Datum</TableHead><TableHead>Teilnehmer</TableHead><TableHead>Typ</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {PRUEFUNGEN.map((p) => (
                <TableRow key={p.id}><TableCell className="font-medium">{p.titel}</TableCell><TableCell>{p.kurs}</TableCell><TableCell>{p.datum}</TableCell><TableCell>{p.teilnehmer}</TableCell><TableCell><Badge variant="outline">{p.typ}</Badge></TableCell><TableCell><Badge variant={p.status === "geplant" ? "outline" : "default"}>{p.status}</Badge></TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {tab === "zertifikate" && (
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">Zertifikate</h1><p className="text-sm text-muted-foreground">Ausgestellte Zertifikate & Urkunden</p></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Schüler</TableHead><TableHead>Zertifikat</TableHead><TableHead>Ausgestellt</TableHead><TableHead>Gültigkeit</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>
              {[
                { schueler: "Max Richter", zertifikat: "Geprüfter Hufpfleger (DHG)", datum: "31.08.2024", gueltig: "Unbefristet" },
                { schueler: "Julia Peters", zertifikat: "Geprüfter Hufpfleger (DHG)", datum: "31.08.2024", gueltig: "Unbefristet" },
                { schueler: "David Stein", zertifikat: "Basis-Hufpflege", datum: "15.06.2024", gueltig: "3 Jahre" },
              ].map((z, i) => (
                <TableRow key={i}><TableCell className="font-medium">{z.schueler}</TableCell><TableCell>{z.zertifikat}</TableCell><TableCell>{z.datum}</TableCell><TableCell>{z.gueltig}</TableCell><TableCell><Button size="sm" variant="outline">PDF</Button></TableCell></TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      <Dialog open={!!selectedKurs} onOpenChange={() => setSelectedKurs(null)}>
        <DialogContent><DialogHeader><DialogTitle>{selectedKurs?.name}</DialogTitle><DialogDescription>{selectedKurs?.dozent} · {selectedKurs?.schueler} Schüler</DialogDescription></DialogHeader>
          {selectedKurs && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Zeitraum:</span> <span className="font-medium">{selectedKurs.start} – {selectedKurs.ende}</span></div>
                <div><span className="text-muted-foreground">Fortschritt:</span> <span className="font-medium">{selectedKurs.fortschritt}%</span></div>
              </div>
              <Progress value={selectedKurs.fortschritt} className="h-3" />
              <div className="flex gap-2 pt-2"><Button size="sm">Schüler verwalten</Button><Button size="sm" variant="outline">Lernplan</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedSchueler} onOpenChange={() => setSelectedSchueler(null)}>
        <DialogContent><DialogHeader><DialogTitle>{selectedSchueler?.name}</DialogTitle><DialogDescription>Kurs: {selectedSchueler?.kurs}</DialogDescription></DialogHeader>
          {selectedSchueler && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Note:</span> <span className="font-medium">{selectedSchueler.note}</span></div>
                <div><span className="text-muted-foreground">Prüfungen:</span> <span className="font-medium">{selectedSchueler.pruefungen}</span></div>
                <div><span className="text-muted-foreground">Fortschritt:</span> <span className="font-medium">{selectedSchueler.fortschritt}%</span></div>
              </div>
              <Progress value={selectedSchueler.fortschritt} className="h-3" />
              <div className="flex gap-2 pt-2"><Button size="sm">Lernfälle zuweisen</Button><Button size="sm" variant="outline">Noten</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalDemoShell>
  );
}
