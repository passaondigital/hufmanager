import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Send, UserPlus, Link2, Globe, Eye, Search, Heart } from "lucide-react";
import { DEMO_PFERDE, DEMO_CHAT_KONTAKTE, DEMO_CHAT_MESSAGES, DEMO_HM_CONNECT, createDemoNutzer, createDemoMitarbeiter } from "./DemoPortalData";
import { DemoSystemId } from "@/components/demo/DemoSystemId";

// ─── Pferdeakten Tab ────────────────────────────
export function PferdeaktenTab() {
  const [selected, setSelected] = useState<typeof DEMO_PFERDE[0] | null>(null);
  const [search, setSearch] = useState("");
  const filtered = DEMO_PFERDE.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.besitzer.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  const scoreColor = (s: number) => s >= 80 ? "text-emerald-500" : s >= 60 ? "text-amber-500" : "text-red-500";
  const statusBadge = (s: string) => {
    const map: Record<string, "default" | "secondary" | "outline"> = { gesund: "default", in_behandlung: "secondary", chronisch: "outline" };
    return <Badge variant={map[s] || "outline"}>{s === "in_behandlung" ? "In Behandlung" : s.charAt(0).toUpperCase() + s.slice(1)}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Geteilte Pferdeakten</h1><p className="text-sm text-muted-foreground">{DEMO_PFERDE.length} Pferde mit Zugriff (Demo-Daten)</p></div>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Pferd, Besitzer oder #EQID suchen…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="grid gap-3">
        {filtered.map((p) => (
          <Card key={p.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelected(p)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Heart className="h-5 w-5 text-primary" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.name}</p>
                      <DemoSystemId id={p.id} />
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                      {p.rasse} · {p.alter} · {p.besitzer} <DemoSystemId id={p.besitzerId} compact />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${scoreColor(p.praeventionScore)}`}>{p.praeventionScore}%</span>
                  {statusBadge(p.status)}
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground items-center flex-wrap">
                <span>Chip: {p.chipNr}</span>
                <span className="flex items-center gap-1">Provider: <DemoSystemId id={p.provider} compact /></span>
                <span>Impfstatus: {p.impfStatus}</span>
                <span>Letzte Beh.: {p.letzteBeh}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{selected?.name} <DemoSystemId id={selected?.id || ""} /></DialogTitle>
            <DialogDescription className="flex items-center gap-1 flex-wrap">{selected?.rasse} · {selected?.alter} · {selected?.besitzer} <DemoSystemId id={selected?.besitzerId || ""} compact /></DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Chip-Nr.:</span> <span className="font-medium">{selected.chipNr}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(selected.status)}</div>
                <div><span className="text-muted-foreground">Impfstatus:</span> <Badge variant={selected.impfStatus === "aktuell" ? "default" : "destructive"}>{selected.impfStatus}</Badge></div>
                <div className="flex items-center gap-1"><span className="text-muted-foreground">Provider:</span> <DemoSystemId id={selected.provider} /></div>
                <div className="flex items-center gap-1"><span className="text-muted-foreground">Besitzer:</span> <DemoSystemId id={selected.besitzerId} /></div>
                <div><span className="text-muted-foreground">Letzte Behandlung:</span> <span className="font-medium">{selected.letzteBeh}</span></div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Präventions-Score</p>
                <div className="flex items-center gap-3"><Progress value={selected.praeventionScore} className="h-3 flex-1" /><span className={`font-bold ${scoreColor(selected.praeventionScore)}`}>{selected.praeventionScore}%</span></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline">Verlauf ansehen</Button>
                <Button size="sm" variant="outline">Huf-Daten</Button>
                <Button size="sm" variant="outline">Dokumente</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Chat / Nachrichten Tab ────────────────────────────
export function ChatTab() {
  const [activeChat, setActiveChat] = useState<string | null>("k1");
  const [newMsg, setNewMsg] = useState("");

  const activeKontakt = DEMO_CHAT_KONTAKTE.find(k => k.id === activeChat);

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Nachrichten</h1><p className="text-sm text-muted-foreground">Kommunikation mit Profis & Besitzern (Demo-Daten)</p></div>
      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <Card className="lg:h-[500px] overflow-y-auto">
          <CardContent className="p-2 space-y-1">
            {DEMO_CHAT_KONTAKTE.map((k) => (
              <button key={k.id} onClick={() => setActiveChat(k.id)} className={`w-full text-left p-3 rounded-lg transition-colors ${activeChat === k.id ? "bg-primary/10" : "hover:bg-muted/50"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm">{k.name}</span>
                    <DemoSystemId id={k.visibleId} compact />
                  </div>
                  {k.ungelesen > 0 && <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">{k.ungelesen}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{k.letzteNachricht}</p>
                <div className="flex items-center justify-between mt-1"><Badge variant="outline" className="text-[10px] h-4">{k.rolle}</Badge><span className="text-[10px] text-muted-foreground">{k.zeit}</span></div>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:h-[500px] flex flex-col">
          <CardHeader className="pb-2 border-b shrink-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{activeKontakt?.name || "Chat wählen"}</CardTitle>
              {activeKontakt && <DemoSystemId id={activeKontakt.visibleId} />}
            </div>
            {activeKontakt && <p className="text-xs text-muted-foreground">{activeKontakt.rolle}</p>}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {DEMO_CHAT_MESSAGES.map((m) => (
              <div key={m.id} className={`flex ${m.typ === "ausgehend" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.typ === "ausgehend" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.typ === "eingehend" && (
                    <p className="text-[10px] font-medium mb-0.5 opacity-70 flex items-center gap-1">
                      {m.absender} {m.absenderId && <DemoSystemId id={m.absenderId} compact />}
                    </p>
                  )}
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.typ === "ausgehend" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{m.zeit}</p>
                </div>
              </div>
            ))}
          </CardContent>
          <div className="p-3 border-t shrink-0">
            <div className="flex gap-2">
              <Input placeholder="Nachricht schreiben…" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} className="flex-1" />
              <Button size="icon" disabled={!newMsg}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Hufi Connect Tab ────────────────────────────
export function HMConnectTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Hufi Connect</h1><p className="text-sm text-muted-foreground">Netzwerk-Verbindungen verwalten (Demo-Daten)</p></div>
        <Button><Link2 className="h-4 w-4 mr-1" /> Verbindung anfragen</Button>
      </div>
      <div className="grid gap-3">
        {DEMO_HM_CONNECT.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Link2 className="h-5 w-5 text-primary" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{c.name}</p>
                    <DemoSystemId id={c.visibleId} />
                  </div>
                  <p className="text-xs text-muted-foreground">{c.typ} · {c.pferde} Pferde geteilt</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={c.status === "verbunden" ? "default" : "outline"}>{c.status === "verbunden" ? "Verbunden" : "Ausstehend"}</Badge>
                {c.status === "verbunden" && <span className="text-xs text-muted-foreground">seit {c.seit}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Nutzer Tab (allgemein) ────────────────────────────
export function NutzerTab({ orgDomain, orgId }: { orgDomain: string; orgId?: string }) {
  const users = createDemoNutzer("demo", orgDomain, orgId);
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nutzer-Verwaltung</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">{users.length} Nutzer (Demo-Daten) · Org: <DemoSystemId id={orgId || "#OID-D001"} compact /></p>
        </div>
        <Button onClick={() => setShowInvite(true)}><UserPlus className="h-4 w-4 mr-1" /> Nutzer einladen</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>#ID</TableHead><TableHead>Name</TableHead><TableHead>Rolle</TableHead><TableHead>E-Mail</TableHead><TableHead>Letzter Login</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.email}>
                  <TableCell><DemoSystemId id={u.id} /></TableCell>
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
      <p className="text-[11px] text-muted-foreground text-center">ℹ️ Alle dargestellten Nutzer sind fiktive Demo-Accounts.</p>
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nutzer einladen</DialogTitle><DialogDescription>Senden Sie eine Einladung per E-Mail</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="E-Mail-Adresse" /><Input placeholder="Name (optional)" />
            <div className="flex gap-2"><Badge variant="outline" className="cursor-pointer">Admin</Badge><Badge variant="outline" className="cursor-pointer">Sachbearbeiter</Badge><Badge variant="outline" className="cursor-pointer">Viewer</Badge></div>
            <Button className="w-full" onClick={() => setShowInvite(false)}>Einladung senden</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Mitarbeiter Tab ────────────────────────────
export function MitarbeiterTab({ orgDomain, orgId }: { orgDomain: string; orgId?: string }) {
  const mitarbeiter = createDemoMitarbeiter(orgDomain, orgId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mitarbeiter</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">{mitarbeiter.length} Mitarbeiter (Demo-Daten) · Org: <DemoSystemId id={orgId || "#OID-D001"} compact /></p>
        </div>
        <Button><UserPlus className="h-4 w-4 mr-1" /> Mitarbeiter anlegen</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>#ID</TableHead><TableHead>Name</TableHead><TableHead>Position</TableHead><TableHead>Abteilung</TableHead><TableHead>E-Mail</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {mitarbeiter.map((m) => (
                <TableRow key={m.id}>
                  <TableCell><DemoSystemId id={m.id} /></TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.position}</TableCell>
                  <TableCell><Badge variant="outline">{m.abteilung}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{m.email}</TableCell>
                  <TableCell><Badge variant={m.status === "aktiv" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-[11px] text-muted-foreground text-center">ℹ️ Alle dargestellten Mitarbeiter sind fiktive Demo-Accounts.</p>
    </div>
  );
}

// ─── Landingpage Tab ────────────────────────────
export function LandingpageTab({ orgName }: { orgName: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Website & Landingpage</h1><p className="text-sm text-muted-foreground">Erstellen Sie Ihre eigene Webpräsenz mit dem HM-Baukasten</p></div>
        <Button><Globe className="h-4 w-4 mr-1" /> Editor öffnen</Button>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Ihre Website</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center"><Globe className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Vorschau: {orgName.toLowerCase().replace(/\s+/g, "-")}.hufmanager.de</p></div>
            </div>
            <div className="flex gap-2"><Button size="sm">Bearbeiten</Button><Button size="sm" variant="outline">Vorschau</Button><Button size="sm" variant="outline">Veröffentlichen</Button></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Verfügbare Sektionen</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {["Hero & Branding", "Über uns", "Leistungen / Produkte", "Team", "Referenzen & Bewertungen", "Kontakt & Buchung", "FAQ", "Galerie", "Partner-Logos"].map((s) => (
              <div key={s} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                <span>{s}</span><Badge variant="outline">Verfügbar</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Embed-Widgets</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Integrieren Sie HufManager-Funktionen direkt in Ihre bestehende Website:</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[{ name: "Buchungs-Widget", desc: "Online-Terminbuchung" }, { name: "Bewertungs-Widget", desc: "Kundenbewertungen anzeigen" }, { name: "Kontakt-Widget", desc: "Kontaktformular" }].map((w) => (
              <Card key={w.name}><CardContent className="p-3 text-center"><p className="text-sm font-medium">{w.name}</p><p className="text-xs text-muted-foreground">{w.desc}</p><Button size="sm" variant="outline" className="mt-2">Code kopieren</Button></CardContent></Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
