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
  Clock, 
  Lightbulb,
  Link2,
  Layers,
  Globe
} from "lucide-react";

// Custom Horse icon
const Horse = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 8.5c0-.28-.22-.5-.5-.5h-3.18a1 1 0 0 1-.86-.49L16 5l-1.5 1.5L13 5l-1.46 2.51a1 1 0 0 1-.86.49H7.5a.5.5 0 0 0-.5.5v2.68a1 1 0 0 1-.29.71l-3.5 3.5a1 1 0 0 0-.21.33l-1 2.5a.5.5 0 0 0 .46.78h3.18a1 1 0 0 0 .71-.29l2.15-2.15V19a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2h2v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5.32a1 1 0 0 1 .29-.71l2.92-2.92a1 1 0 0 0 .29-.71V8.5Z"/>
  </svg>
);

// ID Dictionary Data
const ID_DICTIONARY = [
  {
    id: "#PID / #uid",
    name: "Provider ID",
    table: "profiles + user_roles",
    description: "Hauptbenutzer-ID für Hufbearbeiter/Anbieter",
    format: "PID-XXXXXX",
    relations: [
      "→ business_settings (1:1)",
      "→ offers (1:n)",
      "→ services (1:n)",
      "→ inventory_items (1:n)",
      "→ invoices (1:n als provider_id)"
    ]
  },
  {
    id: "#KID",
    name: "Kunden ID",
    table: "profiles (role=client)",
    description: "Kunde/Pferdebesitzer mit App-Zugang",
    format: "KID-XXXXXX",
    relations: [
      "→ horses (1:n als owner_id)",
      "→ access_grants (n:m mit Provider)",
      "→ invoices (1:n als client_id)",
      "→ conversations (1:n)"
    ]
  },
  {
    id: "#EQID",
    name: "Equiden ID",
    table: "horses",
    description: "Eindeutige Pferde-Identifikation",
    format: "EQID-XXXXXX",
    relations: [
      "← profiles.owner_id (n:1)",
      "→ appointments (1:n)",
      "→ hoof_analyses (1:n)",
      "→ horse_documents (1:n)",
      "→ media_assets (1:n)"
    ]
  },
  {
    id: "#GP_ID",
    name: "Global Product ID",
    table: "global_products",
    description: "Admin-gepflegte Produktvorlagen (Goodsmith, etc.)",
    format: "UUID",
    relations: [
      "→ inventory_items.global_product_id (1:n)",
      "Admin kann zentral pflegen"
    ]
  },
  {
    id: "#INV_ID",
    name: "Inventory Item ID",
    table: "inventory_items",
    description: "Provider-eigenes Lager mit Beständen",
    format: "UUID",
    relations: [
      "← profiles.user_id (n:1)",
      "← global_products (optional)",
      "→ offer_materials (n:m mit Offers)"
    ]
  },
  {
    id: "#OID",
    name: "Offer ID",
    table: "offers",
    description: "Dienstleistungs-Pakete / Angebote",
    format: "UUID",
    relations: [
      "← profiles.provider_id (n:1)",
      "→ offer_materials (1:n) → Rezeptur",
      "Nutzt inventory_items für Kalkulation"
    ]
  },
  {
    id: "#INV_NO",
    name: "Rechnungsnummer",
    table: "invoices",
    description: "Fortlaufende Rechnungsnummer",
    format: "RE-2026-XXXX",
    relations: [
      "← profiles.provider_id (n:1)",
      "← profiles.client_id (n:1)",
      "← horses.horse_id (optional)"
    ]
  }
];

// Module Data
const MODULES = [
  {
    id: "calendar",
    name: "Kalender",
    icon: Calendar,
    status: "active" as const,
    description: "Terminverwaltung für Hufbearbeiter",
    features: [
      "Termine erstellen & bearbeiten",
      "Serien-Termine (wiederkehrend)",
      "Kunden-Bestätigung per Token",
      "iCal Export für externe Kalender",
      "Push-Benachrichtigungen"
    ],
    dependencies: ["horses", "profiles"],
    tables: ["appointments", "appointment_reminders"]
  },
  {
    id: "inventory",
    name: "Lager & Material",
    icon: Package,
    status: "active" as const,
    description: "Materialverwaltung mit Bestandsführung",
    features: [
      "Produkte aus Katalog übernehmen",
      "Min-Bestand Warnungen",
      "Einkaufsliste generieren",
      "EK/VK Preise pflegen",
      "Rezepturen für Angebote"
    ],
    dependencies: ["global_products"],
    tables: ["inventory_items", "offer_materials", "global_products"]
  },
  {
    id: "invoices",
    name: "Rechnungen",
    icon: FileText,
    status: "active" as const,
    description: "Rechnungserstellung mit PDF-Export",
    features: [
      "PDF-Generierung (jsPDF)",
      "Auto-Nummerierung",
      "Status-Tracking (Offen/Bezahlt)",
      "Kunden-Portal Ansicht",
      "E-Mail Versand"
    ],
    dependencies: ["profiles", "horses", "offers"],
    tables: ["invoices"]
  },
  {
    id: "offers",
    name: "Angebote",
    icon: Layers,
    status: "active" as const,
    description: "Dienstleistungs-Pakete mit Kalkulation",
    features: [
      "Rezeptur-Editor (Material-Verknüpfung)",
      "Margen-Kalkulation",
      "Bestandsprüfung (Stock Badge)",
      "Landing Page Integration",
      "Buchbare vs. Nur-Anzeige"
    ],
    dependencies: ["inventory_items"],
    tables: ["offers", "offer_materials"]
  },
  {
    id: "hufanalyse",
    name: "Hufanalyse (LTZ)",
    icon: Horse,
    status: "active" as const,
    description: "Latero-Torsale-Zehenachse Analyse",
    features: [
      "4-Huf Detailerfassung",
      "Gangbild-Analyse",
      "Foto-Dokumentation",
      "PDF-Report Export",
      "Verlaufsvergleich"
    ],
    dependencies: ["horses", "appointments"],
    tables: ["hoof_analyses", "hoof_photos"]
  },
  {
    id: "chat",
    name: "Chat / Nachrichten",
    icon: Users,
    status: "active" as const,
    description: "Kommunikation zwischen Provider & Client",
    features: [
      "Echtzeit-Nachrichten",
      "Bild-Uploads",
      "Push-Benachrichtigungen",
      "Ungelesen-Counter",
      "Konversations-Übersicht"
    ],
    dependencies: ["profiles", "access_grants"],
    tables: ["conversations", "messages"]
  },
  {
    id: "landing",
    name: "Landing Page",
    icon: Globe,
    status: "active" as const,
    description: "Öffentliche Provider-Website",
    features: [
      "Subdomain-Routing",
      "Bewertungen anzeigen",
      "Kontaktformular → Leads",
      "Galerie-Manager",
      "SEO-optimiert"
    ],
    dependencies: ["business_settings", "reviews", "offers"],
    tables: ["business_settings", "leads", "reviews"]
  },
  {
    id: "network",
    name: "Netzwerk",
    icon: Link2,
    status: "beta" as const,
    description: "Verbindungen zwischen Providern & Clients",
    features: [
      "Verbindungsanfragen",
      "QR-Code / Magic Links",
      "Zugriffsrechte verwalten",
      "Tierarzt-Kontakte teilen"
    ],
    dependencies: ["profiles"],
    tables: ["access_grants", "magic_links"]
  },
  {
    id: "subscriptions",
    name: "Abo-System",
    icon: CheckCircle2,
    status: "active" as const,
    description: "CopeCart Integration für Zahlungen",
    features: [
      "CopeCart Webhook",
      "Plan-Überschreibung (Admin)",
      "Feature Flags",
      "Zugangs-Ablaufdatum"
    ],
    dependencies: ["profiles"],
    tables: ["profiles (subscription_*)", "subscription_links"]
  }
];

// Data Flow Steps
const DATA_FLOW = [
  {
    step: 1,
    from: "Provider (Du)",
    fromIcon: User,
    action: "Erstellt",
    to: "Business Settings",
    toIcon: Database,
    description: "Firmenname, Logo, Subdomain, Impressum"
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
    to: "Lead / Anfrage",
    toIcon: FileText,
    description: "Kontaktformular → leads Tabelle"
  },
  {
    step: 4,
    from: "Provider",
    fromIcon: User,
    action: "Erstellt",
    to: "Client Profil",
    toIcon: Users,
    description: "Kunde mit #KID, optional App-Einladung"
  },
  {
    step: 5,
    from: "Client",
    fromIcon: Users,
    action: "Loggt ein",
    to: "Client App",
    toIcon: Database,
    description: "Sieht eigene Pferde, Termine, Rechnungen"
  },
  {
    step: 6,
    from: "access_grants",
    fromIcon: Link2,
    action: "Verknüpft",
    to: "Provider ↔ Client",
    toIcon: Users,
    description: "Berechtigungen: can_view_medical, can_create_appointments"
  },
  {
    step: 7,
    from: "Client",
    fromIcon: Users,
    action: "Legt an",
    to: "Pferd (#EQID)",
    toIcon: Horse,
    description: "Provider wird benachrichtigt (Trigger)"
  },
  {
    step: 8,
    from: "Provider",
    fromIcon: User,
    action: "Erstellt",
    to: "Termin",
    toIcon: Calendar,
    description: "Client bekommt Push + Bestätigungs-Link"
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
          System & Dokumentation
        </h1>
        <p className="text-muted-foreground mt-1">
          Architektur-Übersicht, ID-Dictionary und Modul-Verknüpfungen
        </p>
      </div>

      <Tabs defaultValue="ids" className="space-y-4">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="ids" className="gap-2">
            <Database className="w-4 h-4" />
            Daten-Struktur
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-2">
            <Layers className="w-4 h-4" />
            Module
          </TabsTrigger>
          <TabsTrigger value="flow" className="gap-2">
            <Link2 className="w-4 h-4" />
            Client-Bridge
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ID Dictionary */}
        <TabsContent value="ids" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                ID-Dictionary
              </CardTitle>
              <CardDescription>
                Übersicht aller System-IDs und ihrer Verknüpfungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">ID</TableHead>
                      <TableHead className="w-[140px]">Name</TableHead>
                      <TableHead className="w-[180px]">Tabelle</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead className="w-[280px]">Verknüpfungen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ID_DICTIONARY.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <code className="px-2 py-1 bg-primary/10 text-primary rounded font-mono text-sm">
                            {item.id}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <code className="text-xs text-muted-foreground">{item.table}</code>
                          <div className="text-xs text-muted-foreground mt-1">{item.format}</div>
                        </TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell>
                          <ul className="text-xs space-y-1">
                            {item.relations.map((rel, idx) => (
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

          {/* Quick Reference Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Quick Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Provider erstellt Client:</span>
                  <p className="text-muted-foreground">profiles.created_by_provider_id wird gesetzt → Auto-Trigger erstellt access_grant</p>
                </div>
                <div>
                  <span className="font-semibold">Rezeptur-Logik:</span>
                  <p className="text-muted-foreground">offers ↔ offer_materials ↔ inventory_items (n:m Beziehung)</p>
                </div>
                <div>
                  <span className="font-semibold">Soft-Delete:</span>
                  <p className="text-muted-foreground">profiles.deleted_at, horses.deleted_at, contacts.deleted_at</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Modules */}
        <TabsContent value="modules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {MODULES.map((module) => (
              <Card key={module.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <module.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{module.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{module.description}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(module.status)}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {/* Features */}
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Features</span>
                    <ul className="mt-1 space-y-1">
                      {module.features.slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="text-xs flex items-start gap-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {module.features.length > 4 && (
                        <li className="text-xs text-muted-foreground">
                          +{module.features.length - 4} weitere...
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Dependencies */}
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Abhängigkeiten</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {module.dependencies.map((dep, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Tables */}
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tabellen</span>
                    <div className="mt-1 text-xs text-muted-foreground font-mono">
                      {module.tables.join(", ")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: Client-Provider Bridge */}
        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Client-Provider Bridge
              </CardTitle>
              <CardDescription>
                Datenfluss von der Provider-Einrichtung bis zur Client-Nutzung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DATA_FLOW.map((flow, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
                    {/* Step Number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{flow.step}</span>
                    </div>

                    {/* From */}
                    <div className="flex items-center gap-2 min-w-[140px]">
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

          {/* Summary Card */}
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
                  <p className="text-muted-foreground">Provider, Client, Horse, Appointment, Invoice, Offer</p>
                </div>
                <div>
                  <span className="font-semibold">Zugriffskontrolle:</span>
                  <p className="text-muted-foreground">RLS Policies + access_grants Tabelle für Provider↔Client Berechtigungen</p>
                </div>
                <div>
                  <span className="font-semibold">Notifications:</span>
                  <p className="text-muted-foreground">DB-Trigger → notifications Tabelle + Push via Edge Function</p>
                </div>
                <div>
                  <span className="font-semibold">Multi-Tenancy:</span>
                  <p className="text-muted-foreground">Jeder Provider sieht nur seine Daten via user_id / provider_id Filters</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
