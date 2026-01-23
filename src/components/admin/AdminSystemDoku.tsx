import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Database, 
  Users, 
  Calendar, 
  Package, 
  FileText, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Lightbulb,
  Link2,
  Layers,
  Globe,
  MessageSquare,
  TrendingUp,
  Camera,
  Clock,
  Bell,
  Smartphone,
  Shield
} from "lucide-react";

// Custom Horse icon
const Horse = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 8.5c0-.28-.22-.5-.5-.5h-3.18a1 1 0 0 1-.86-.49L16 5l-1.5 1.5L13 5l-1.46 2.51a1 1 0 0 1-.86.49H7.5a.5.5 0 0 0-.5.5v2.68a1 1 0 0 1-.29.71l-3.5 3.5a1 1 0 0 0-.21.33l-1 2.5a.5.5 0 0 0 .46.78h3.18a1 1 0 0 0 .71-.29l2.15-2.15V19a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2h2v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5.32a1 1 0 0 1 .29-.71l2.92-2.92a1 1 0 0 0 .29-.71V8.5Z"/>
  </svg>
);

// ============================================
// THE HOLY TRINITY - Core Data Architecture
// ============================================
const HOLY_TRINITY = [
  {
    id: "#PID",
    name: "Provider ID",
    table: "profiles + user_roles (role='provider')",
    description: "Der eingeloggte Hufbearbeiter/Anbieter. Zentrale Entität für alle Business-Daten.",
    format: "PID-XXXXXX (6-stellig)",
    color: "text-primary",
    bgColor: "bg-primary/10",
    relations: [
      "→ business_settings (1:1) - Firmendaten",
      "→ offers (1:n) - Dienstleistungen",
      "→ contacts/#KID (1:n) - Kunden",
      "→ invoices (1:n) - Rechnungen",
      "→ appointments (1:n) - Termine"
    ]
  },
  {
    id: "#KID",
    name: "Kunden ID",
    table: "profiles (role='client') + contacts",
    description: "Pferdebesitzer mit optionalem App-Zugang. Gehört immer zu einem #PID.",
    format: "KID-XXXXXX (6-stellig)",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    relations: [
      "← profiles.provider_id (n:1) - Zugehöriger Provider",
      "→ horses/#EQID (1:n) - Besitzt Pferde",
      "→ access_grants (n:m) - Berechtigungen",
      "→ invoices (1:n) - Erhält Rechnungen",
      "→ conversations (1:n) - Chat mit Provider"
    ]
  },
  {
    id: "#EQID",
    name: "Equiden ID",
    table: "horses",
    description: "Das Pferd – zentrale Dokumentations-Entität. Alle Behandlungen hier.",
    format: "EQID-XXXXXX (6-stellig)",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    relations: [
      "← profiles.owner_id/#KID (n:1) - Gehört zu Besitzer",
      "→ appointments (1:n) - Termine",
      "→ hoof_analyses (1:n) - LTZ-Analysen",
      "→ horse_documents (1:n) - Dokumente",
      "→ media_assets (1:n) - Fotos/Collagen"
    ]
  }
];

// ============================================
// DIE 5 A's - Workflow Navigation
// ============================================
const FIVE_AS_WORKFLOW = [
  {
    number: 1,
    id: "anfragen",
    name: "Anfragen",
    icon: MessageSquare,
    route: "/anfragen",
    description: "Inbox & CRM – Alle Kommunikation zentral",
    features: [
      "Neue Leads aus Landing Page",
      "Massen-Benachrichtigung (Broadcast)",
      "Push + Email an Kunden",
      "Chat-Verlauf"
    ],
    bigOrangeButton: "Neue Anfrage"
  },
  {
    number: 2,
    id: "angebote",
    name: "Angebote",
    icon: Package,
    route: "/angebote",
    description: "Sales & Kostenvoranschläge",
    features: [
      "Dienstleistungs-Pakete erstellen",
      "Rezeptur-Editor (Material-Verknüpfung)",
      "Margen-Kalkulation",
      "Landing Page Integration"
    ],
    bigOrangeButton: "Neues Angebot"
  },
  {
    number: 3,
    id: "aufnahme",
    name: "Aufnahme",
    icon: Users,
    route: "/customers",
    description: "Kunden #KID & Pferde #EQID verwalten",
    features: [
      "Kunden-Übersicht & Detail",
      "Pferde-Akte (Stammdaten, Medizin, Huf-Status)",
      "Dokumente & Röntgenbilder",
      "HufCam Pro Integration"
    ],
    bigOrangeButton: "Neues Pferd"
  },
  {
    number: 4,
    id: "auffassen",
    name: "Auffassen",
    icon: Calendar,
    route: "/calendar",
    description: "Termine, Kalender, Durchführung",
    features: [
      "Kalender & Touren-Planung",
      "Termin-Tracking (Start/Stop)",
      "Tacho-Foto für Kilometer",
      "HufCam Pro Wizard",
      "GPS-Integration"
    ],
    bigOrangeButton: "Termin starten"
  },
  {
    number: 5,
    id: "analyse",
    name: "Analyse",
    icon: TrendingUp,
    route: "/rechnungen",
    description: "Rechnungen, Finanzen, Doku-Historie",
    features: [
      "Rechnungserstellung (PDF)",
      "DATEV-Export",
      "ZUGFeRD-konform",
      "Umsatz-Dashboard",
      "Offene Posten"
    ],
    bigOrangeButton: "Neue Rechnung"
  }
];

// ============================================
// CORE FEATURES
// ============================================
const CORE_FEATURES = [
  {
    id: "hufcam-pro",
    name: "HufCam Pro",
    icon: Camera,
    status: "active" as const,
    location: "Auffassen + Aufnahme",
    description: "Foto-Dokumentation mit strukturiertem Wizard",
    features: [
      "4-Huf Wizard: VL → VR → HL → HR",
      "4 Ansichten: Dorsal, Lateral, Sohle, Ballen",
      "Overlay-Guides (Schablonen) über Kamera",
      "Auto-Collage (1080x1080) mit Branding",
      "Social-Media-Ready Export"
    ]
  },
  {
    id: "feierabend-waechter",
    name: "Feierabend-Wächter",
    icon: Clock,
    status: "active" as const,
    location: "AppHeader (Global)",
    description: "Status-Toggle für Arbeitszeiten",
    features: [
      "Manueller Toggle: Im Dienst / Feierabend",
      "Auto-Erkennung via business_hours",
      "Blockiert neue Anfragen wenn aktiv",
      "LocalStorage-Persistenz",
      "Cross-Tab Sync"
    ]
  },
  {
    id: "work-tracker",
    name: "Arbeitszeit-Tracking",
    icon: Clock,
    status: "active" as const,
    location: "Auffassen (Termin-Detail)",
    description: "Stoppuhr & Kilometer-Erfassung",
    features: [
      "Start/Pause/Stop Timer",
      "Tacho-Foto (Anfang & Ende)",
      "Automatische Streckenberechnung",
      "Preis pro Kilometer",
      "In Rechnung übernehmen"
    ]
  },
  {
    id: "broadcast",
    name: "Massen-Benachrichtigung",
    icon: Bell,
    status: "active" as const,
    location: "Anfragen",
    description: "Rundmail an Kunden senden",
    features: [
      "Zielgruppe: Alle / Diese Woche / Überfällig",
      "Vorlagen: Krankheit, Urlaub",
      "Push-Notification + In-App",
      "Optional: Email-Kopie",
      "Batch-Verarbeitung"
    ]
  },
  {
    id: "client-app",
    name: "Client-App",
    icon: Smartphone,
    status: "active" as const,
    location: "Separater Login-Flow",
    description: "Pferdebesitzer-Portal (nur lesen)",
    features: [
      "Eigene Pferde einsehen (#EQID)",
      "Terminübersicht",
      "Rechnungen downloaden",
      "Chat mit Provider",
      "Huf-Collagen vom Profi sehen"
    ]
  }
];

// ============================================
// DATA FLOW
// ============================================
const DATA_FLOW = [
  {
    step: 1,
    from: "#PID (Provider)",
    fromIcon: User,
    action: "Erstellt",
    to: "Business Settings",
    toIcon: Database,
    description: "Firmenname, Logo, Subdomain, AGB"
  },
  {
    step: 2,
    from: "Business Settings",
    fromIcon: Database,
    action: "Generiert",
    to: "Landing Page",
    toIcon: Globe,
    description: "Öffentliche Website unter subdomain.hufmanager.de"
  },
  {
    step: 3,
    from: "Besucher",
    fromIcon: Users,
    action: "Füllt aus",
    to: "Lead → Anfragen",
    toIcon: MessageSquare,
    description: "Kontaktformular → leads Tabelle"
  },
  {
    step: 4,
    from: "#PID",
    fromIcon: User,
    action: "Erstellt",
    to: "#KID (Kunde)",
    toIcon: Users,
    description: "Kunde mit optionalem App-Zugang (Magic Link)"
  },
  {
    step: 5,
    from: "#KID",
    fromIcon: Users,
    action: "Legt an",
    to: "#EQID (Pferd)",
    toIcon: Horse,
    description: "Pferd wird der Akte hinzugefügt"
  },
  {
    step: 6,
    from: "#PID",
    fromIcon: User,
    action: "Plant",
    to: "Termin (Auffassen)",
    toIcon: Calendar,
    description: "#KID bekommt Push + Bestätigungs-Link"
  },
  {
    step: 7,
    from: "#PID",
    fromIcon: User,
    action: "Dokumentiert",
    to: "HufCam Pro Collage",
    toIcon: Camera,
    description: "Wird an #EQID angehängt, #KID kann sehen"
  },
  {
    step: 8,
    from: "#PID",
    fromIcon: User,
    action: "Stellt",
    to: "Rechnung (Analyse)",
    toIcon: FileText,
    description: "#KID kann in Client-App downloaden"
  }
];

// ============================================
// UI PRINCIPLES
// ============================================
const UI_PRINCIPLES = [
  {
    name: "Grandma-Test",
    description: "App muss in 10 Minuten ohne Handbuch verständlich sein",
    icon: "👵"
  },
  {
    name: "Big Orange Button",
    description: "Pro Screen nur EINE Hauptaktion in Orange, Rest dezent",
    icon: "🟠"
  },
  {
    name: "Numbered Navigation",
    description: "Die 5 A's mit Nummern 1-5 für klaren Workflow",
    icon: "1️⃣"
  },
  {
    name: "Friendly Empty States",
    description: "Keine leeren Tabellen – motivierende Texte + CTA",
    icon: "💬"
  },
  {
    name: "Hidden Pro Features",
    description: "DATEV, ZUGFeRD etc. in 3-Punkt-Menü, nicht auf erster Ebene",
    icon: "⋮"
  }
];

const getStatusBadge = (status: "active" | "beta" | "planned") => {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Aktiv</Badge>;
    case "beta":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Beta</Badge>;
    case "planned":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Geplant</Badge>;
  }
};

export function AdminSystemDoku() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          Mission Control – System & Dokumentation
        </h1>
        <p className="text-muted-foreground mt-1">
          Strategische Architektur, Die 5 A's Workflow, Das Huf-Dreieck
        </p>
      </div>

      {/* UI Principles Banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            UI-Prinzipien (Grandma-Test)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {UI_PRINCIPLES.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{p.icon}</span>
                <div>
                  <span className="font-medium">{p.name}:</span>
                  <span className="text-muted-foreground ml-1">{p.description}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="trinity" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="trinity" className="gap-2">
            <Database className="w-4 h-4" />
            Huf-Dreieck
          </TabsTrigger>
          <TabsTrigger value="fiveAs" className="gap-2">
            <Layers className="w-4 h-4" />
            Die 5 A's
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Camera className="w-4 h-4" />
            Core Features
          </TabsTrigger>
          <TabsTrigger value="flow" className="gap-2">
            <Link2 className="w-4 h-4" />
            Datenfluss
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Das Huf-Dreieck (Holy Trinity) */}
        <TabsContent value="trinity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Das Huf-Dreieck – Core Daten-Architektur
              </CardTitle>
              <CardDescription>
                Alle Features basieren auf diesem Dreieck: #PID → #KID → #EQID
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Visual Triangle */}
              <div className="flex justify-center mb-6">
                <div className="relative w-80 h-64">
                  {/* Top: PID */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto border-2 border-primary">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-bold text-primary mt-2">#PID</p>
                    <p className="text-xs text-muted-foreground">Provider</p>
                  </div>
                  
                  {/* Bottom Left: KID */}
                  <div className="absolute bottom-0 left-0 text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto border-2 border-blue-500">
                      <Users className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="font-bold text-blue-500 mt-2">#KID</p>
                    <p className="text-xs text-muted-foreground">Kunde</p>
                  </div>
                  
                  {/* Bottom Right: EQID */}
                  <div className="absolute bottom-0 right-0 text-center">
                    <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto border-2 border-amber-500">
                      <Horse className="w-8 h-8 text-amber-500" />
                    </div>
                    <p className="font-bold text-amber-500 mt-2">#EQID</p>
                    <p className="text-xs text-muted-foreground">Equide</p>
                  </div>
                  
                  {/* Connection Lines */}
                  <svg className="absolute inset-0 w-full h-full" style={{ zIndex: -1 }}>
                    <line x1="50%" y1="25%" x2="15%" y2="75%" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="5,5" />
                    <line x1="50%" y1="25%" x2="85%" y2="75%" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="5,5" />
                    <line x1="15%" y1="75%" x2="85%" y2="75%" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="5,5" />
                  </svg>
                </div>
              </div>

              {/* Details Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead className="w-[120px]">Name</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead className="w-[280px]">Verknüpfungen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {HOLY_TRINITY.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <code className={`px-2 py-1 ${item.bgColor} ${item.color} rounded font-mono text-sm font-bold`}>
                            {item.id}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell>
                          <ul className="text-xs space-y-1">
                            {item.relations.slice(0, 3).map((rel, idx) => (
                              <li key={idx} className="text-muted-foreground">{rel}</li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Important Note */}
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                ⚠️ Wichtig: Kein #PRID mehr!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>Die alte "Partner-ID" (#PRID) existiert nicht mehr. Alle Features basieren ausschließlich auf dem Huf-Dreieck:</p>
              <p className="font-mono mt-2 text-muted-foreground">#PID (Provider) → #KID (Kunde) → #EQID (Pferd)</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Die 5 A's */}
        <TabsContent value="fiveAs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Die 5 A's – Profi-Workflow
              </CardTitle>
              <CardDescription>
                Nummerierte Navigation für klaren Arbeitsablauf
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {FIVE_AS_WORKFLOW.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border">
                    {/* Number Badge */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-foreground">{item.number}</span>
                    </div>

                    {/* Icon */}
                    <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
                      <item.icon className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{item.name}</h3>
                        <Badge variant="outline" className="text-xs">{item.route}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        {item.features.map((f, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Big Orange Button */}
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs text-muted-foreground block mb-1">Hauptaktion:</span>
                      <Badge className="bg-primary text-primary-foreground">{item.bigOrangeButton}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Core Features */}
        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CORE_FEATURES.map((feature) => (
              <Card key={feature.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{feature.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{feature.description}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(feature.status)}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Location: {feature.location}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {feature.features.map((f, idx) => (
                      <li key={idx} className="text-xs flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 4: Data Flow */}
        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Datenfluss – Von Einrichtung bis Client-Nutzung
              </CardTitle>
              <CardDescription>
                Schritt-für-Schritt Ablauf im HufManager
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DATA_FLOW.map((flow, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border">
                    {/* Step Number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{flow.step}</span>
                    </div>

                    {/* From */}
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <flow.fromIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{flow.from}</span>
                    </div>

                    {/* Action Arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{flow.action}</span>
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>

                    {/* To */}
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <flow.toIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{flow.to}</span>
                    </div>

                    {/* Description */}
                    <div className="flex-1 text-sm text-muted-foreground hidden lg:block">
                      {flow.description}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Zusammenfassung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Kern-Entitäten:</span>
                  <p className="text-muted-foreground">#PID (Provider), #KID (Kunde), #EQID (Pferd)</p>
                </div>
                <div>
                  <span className="font-semibold">Workflow:</span>
                  <p className="text-muted-foreground">Die 5 A's: Anfragen → Angebote → Aufnahme → Auffassen → Analyse</p>
                </div>
                <div>
                  <span className="font-semibold">Zugriffskontrolle:</span>
                  <p className="text-muted-foreground">RLS Policies + access_grants für #PID↔#KID</p>
                </div>
                <div>
                  <span className="font-semibold">Mobile First:</span>
                  <p className="text-muted-foreground">PWA mit Offline-First Ansatz, Push-Notifications</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
