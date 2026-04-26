import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, ChevronDown, HelpCircle, ArrowRight, Play, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { VideoHelpSection, MODULE_VIDEOS } from '@/components/help/VideoHelpSection';

interface FAQItem {
  question: string;
  answer: string;
  steps?: string[];
  navigateTo?: string;
  navigateLabel?: string;
}

interface FAQCategory {
  id: string;
  title: string;
  emoji: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    id: 'erste-schritte',
    title: 'Erste Schritte',
    emoji: '🚀',
    items: [
      {
        question: 'Wie richte ich meinen Account ein?',
        answer: 'Nach der Registrierung führt dich der Setup-Wizard durch die wichtigsten Schritte: Betriebsname, Standardpreis, erstes Pferd und Impressum.',
        steps: ['Registrieren', 'Setup-Wizard durchlaufen', 'Checkliste im Dashboard abarbeiten'],
        navigateTo: '/home',
        navigateLabel: 'Zum Dashboard',
      },
      {
        question: 'Was muss ich als erstes tun?',
        answer: 'Die Checkliste im Dashboard zeigt dir genau was fehlt. Arbeite sie von oben nach unten ab — dauert keine 5 Minuten.',
        navigateTo: '/home',
        navigateLabel: 'Checkliste anzeigen',
      },
      {
        question: 'Kann ich die Einrichtung später machen?',
        answer: 'Ja, du kannst den Setup-Wizard jederzeit überspringen. Die Checkliste im Dashboard erinnert dich an offene Schritte.',
      },
      {
        question: 'Wie lade ich mein Logo hoch?',
        answer: 'Geh zu Mein Angebot → Betriebsprofil. Dort kannst du Logo, Titelbild und alle Firmendaten eintragen.',
        steps: ['Mein Angebot öffnen', 'Betriebsprofil bearbeiten', 'Logo hochladen'],
        navigateTo: '/mein-angebot',
        navigateLabel: 'Zu Mein Angebot',
      },
    ],
  },
  {
    id: 'kunden-pferde',
    title: 'Kunden & Pferde',
    emoji: '🐴',
    items: [
      {
        question: 'Wie lege ich einen neuen Kunden an?',
        answer: 'Geh zur Kundenliste und tippe auf "+ Kunden anlegen". Name und Telefon reichen — den Rest kannst du später ergänzen.',
        steps: ['Kunden-Seite öffnen', '"+ Kunden anlegen" tippen', 'Name und Telefon eingeben', 'Speichern'],
        navigateTo: '/customers',
        navigateLabel: 'Zur Kundenliste',
      },
      {
        question: 'Wie füge ich einem Kunden ein Pferd hinzu?',
        answer: 'Öffne den Kunden und scrolle zum Bereich "Pferde". Dort kannst du neue Pferde anlegen oder bestehende zuordnen.',
        navigateTo: '/customers',
        navigateLabel: 'Zur Kundenliste',
      },
      {
        question: 'Wie lade ich Kunden ein sich selbst zu registrieren?',
        answer: 'Im Dashboard findest du den Einladungslink. Teile ihn per WhatsApp oder E-Mail — deine Kunden können sich dann selbst registrieren und ihre Pferde sehen.',
        navigateTo: '/home',
        navigateLabel: 'Zum Dashboard',
      },
      {
        question: 'Kann ich Kunden importieren?',
        answer: 'Ja! Unter Verwaltung → Import-Center kannst du Kunden per CSV-Datei importieren.',
        navigateTo: '/management/import',
        navigateLabel: 'Zum Import-Center',
      },
    ],
  },
  {
    id: 'termine',
    title: 'Termine',
    emoji: '📅',
    items: [
      {
        question: 'Wie erstelle ich einen Termin?',
        answer: 'Im Kalender auf einen Tag tippen → Pferd und Datum wählen → fertig. Der Kunde wird automatisch benachrichtigt.',
        steps: ['Kalender öffnen', 'Auf das gewünschte Datum tippen', 'Pferd auswählen', 'Speichern'],
        navigateTo: '/calendar',
        navigateLabel: 'Zum Kalender',
      },
      {
        question: 'Was ist der Tour-Modus?',
        answer: 'Der Tour-Modus plant deine Tagesroute automatisch. Er gruppiert Termine nach PLZ und optimiert die Reihenfolge für minimale Fahrzeit.',
        navigateTo: '/tour',
        navigateLabel: 'Zum Tour-Modus',
      },
      {
        question: 'Wie schließe ich einen Termin ab?',
        answer: 'Öffne den Termin → "Abschließen" → optional Unterschrift und Fotos hinzufügen → Rechnung erstellen. Fertig.',
      },
      {
        question: 'Erinnert Hufi mich an fällige Pferde?',
        answer: 'Ja! Im Dashboard erscheinen automatisch Pferde die bald wieder dran sind. Du siehst auf einen Blick wer nachbearbeitet werden muss.',
        navigateTo: '/home',
        navigateLabel: 'Zum Dashboard',
      },
    ],
  },
  {
    id: 'rechnungen',
    title: 'Rechnungen',
    emoji: '💶',
    items: [
      {
        question: 'Wie erstelle ich eine Rechnung?',
        answer: 'Geh zu Rechnungen → "Neue Rechnung". Wähl den Kunden — die Leistung wird automatisch aus dem Termin übernommen. PDF wird sofort erstellt.',
        steps: ['Rechnungen öffnen', '"Neue Rechnung" tippen', 'Kunden auswählen', 'Positionen prüfen', 'Rechnung erstellen'],
        navigateTo: '/rechnungen',
        navigateLabel: 'Zu Rechnungen',
      },
      {
        question: 'Wo finde ich meine Rechnungsnummer?',
        answer: 'Rechnungsnummern werden automatisch fortlaufend vergeben. Du findest sie in der Rechnungsübersicht.',
        navigateTo: '/rechnungen',
        navigateLabel: 'Zu Rechnungen',
      },
      {
        question: 'Kann ich die MwSt. ändern?',
        answer: 'Ja — unter Management → Mein Profil kannst du den Standard-MwSt.-Satz für dein Land anpassen.',
        navigateTo: '/management/profil',
        navigateLabel: 'Zu Mein Profil',
      },
    ],
  },
  {
    id: 'team',
    title: 'Team',
    emoji: '👥',
    items: [
      {
        question: 'Wie lade ich einen Mitarbeiter ein?',
        answer: 'Unter Team → "Mitarbeiter einladen" verschickst du eine Einladung per E-Mail. Der Mitarbeiter bekommt seinen eigenen Zugang.',
        navigateTo: '/team',
        navigateLabel: 'Zum Team',
      },
      {
        question: 'Was kann ein Mitarbeiter sehen?',
        answer: 'Mitarbeiter sehen nur die Termine und Kunden die ihnen zugewiesen wurden. Rechnungen und Geschäftsdaten bleiben privat.',
      },
    ],
  },
  {
    id: 'abonnement',
    title: 'Abonnement',
    emoji: '⭐',
    items: [
      {
        question: 'Welcher Plan passt zu mir?',
        answer: 'Der Starter-Plan reicht für Einzelkämpfer (bis 10 Pferde). Ab 75 Pferden brauchst du Pro. Mit Mitarbeitern brauchst du Duo oder Team.',
        navigateTo: '/abo-matrix',
        navigateLabel: 'Pläne vergleichen',
      },
      {
        question: 'Wie upgrade ich meinen Plan?',
        answer: 'Unter Abo-Übersicht siehst du alle Optionen und kannst direkt upgraden.',
        navigateTo: '/abo-matrix',
        navigateLabel: 'Zur Abo-Übersicht',
      },
    ],
  },
  {
    id: 'datenschutz',
    title: 'Datenschutz',
    emoji: '🔒',
    items: [
      {
        question: 'Wo werden meine Daten gespeichert?',
        answer: 'Alle Daten werden in der EU (Deutschland) auf Supabase-Servern gespeichert. Die Datenübertragung ist verschlüsselt.',
      },
      {
        question: 'Brauche ich ein Impressum?',
        answer: 'Ja — wenn du deine öffentliche Seite nutzt, ist ein Impressum Pflicht (DSGVO). Du kannst es unter Management → Rechtliches hinterlegen.',
        navigateTo: '/management/rechtliches',
        navigateLabel: 'Impressum bearbeiten',
      },
      {
        question: 'Kann ich meine Daten exportieren?',
        answer: 'Ja, unter Management → Rechtliches → Daten-Export kannst du alle deine Daten als CSV herunterladen.',
        navigateTo: '/management/rechtliches',
        navigateLabel: 'Zum Daten-Export',
      },
    ],
  },
  {
    id: 'pferdeakte',
    title: 'Digitale Pferdeakte',
    emoji: '🐴',
    items: [
      {
        question: 'Was ist die digitale Pferdeakte?',
        answer: 'Die digitale Pferdeakte ist die vollständige Sammlung aller Daten zu deinem Pferd: Stammdaten, Hufhistorie, Gesundheit, Impfpass, Dokumente, Behandlungshistorie und mehr — alles an einem Ort, sicher gespeichert und von dir kontrolliert.',
      },
      {
        question: 'Wer kann meine Pferdeakte sehen?',
        answer: 'Nur Personen denen du explizit Zugriff gewährt hast. Du kannst für jede Person einzeln festlegen was sie sehen dürfen. Zugriffe können jederzeit widerrufen werden. Alle Zugriffe werden protokolliert.',
      },
      {
        question: 'Was passiert wenn ich jemanden von der Pferdeakte entferne?',
        answer: 'Der Zugriff wird sofort entzogen. Die Person kann keine Daten mehr sehen. Bereits eingetragene Behandlungsnotizen bleiben erhalten.',
      },
      {
        question: 'Kann ich die komplette Pferdeakte exportieren?',
        answer: 'Ja. Unter Pferdeakte → Dokumente findest du den Export-Button. Du erhältst alle Daten als PDF und ZIP-Archiv.',
      },
    ],
  },
  {
    id: 'auftragserteilung',
    title: 'Auftragserteilung',
    emoji: '📋',
    items: [
      {
        question: 'Was ist ein Behandlungsauftrag?',
        answer: 'Ein digitaler Auftrag dokumentiert was du mit einem Dienstleister vereinbart hast. Beide Parteien bestätigen den Auftrag. Hufi ist nicht Vertragspartei.',
      },
      {
        question: 'Kann ich einen Auftrag stornieren?',
        answer: 'Ja, solange der Status "Offen" oder "Angenommen" ist. Nach Abschluss ist keine Stornierung mehr möglich.',
      },
    ],
  },
  {
    id: 'pferdeverkauf',
    title: 'Pferdeverkauf & Transfer',
    emoji: '🔄',
    items: [
      {
        question: 'Wie übertrage ich mein Pferd an einen neuen Besitzer?',
        answer: 'Gehe zur Pferdeakte → Status ändern → Pferd verkaufen. Der neue Besitzer muss einen Hufi Account haben. Beide Parteien müssen den Transfer mit einem gemeinsamen Passwort und Kaufvertrag bestätigen.',
      },
      {
        question: 'Was passiert mit der Pferdeakte nach einem Verkauf?',
        answer: 'Der neue Besitzer erhält Zugriff auf die gesamte Akte. Dein Zugriff wird sofort entzogen. Private Notizen die du gemacht hast werden nicht übertragen.',
      },
      {
        question: 'Was wenn der Käufer keinen Hufi Account hat?',
        answer: 'Der Käufer kann sich kostenlos registrieren unter hufiapp.de. Die Basis-Registrierung ist kostenlos.',
      },
    ],
  },
  {
    id: 'datenschutz-erweitert',
    title: 'Datenschutz (erweitert)',
    emoji: '🛡️',
    items: [
      {
        question: 'Wer bekommt Zugriff auf meine Daten bei Behördenanfragen?',
        answer: 'Hufi gibt Daten nur mit richterlichem Beschluss heraus. Eine einfache Behördenanfrage reicht nicht aus.',
      },
      {
        question: 'Wie lange werden Daten nach dem Tod eines Pferdes gespeichert?',
        answer: 'Gemäß unseren AGB werden die Daten gespeichert bis du sie aktiv löschst oder der gesetzliche Aufbewahrungszeitraum abläuft (Rechnungen: 10 Jahre nach §147 AO).',
      },
    ],
  },
];

export default function HilfePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('erste-schritte');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Filter FAQ items by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_DATA;

    const q = searchQuery.toLowerCase();
    return FAQ_DATA.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  const totalResults = filteredCategories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <HelpCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Hilfe & FAQ</h1>
        <p className="text-muted-foreground">
          Finde sofort Antworten — oder frag Hufi direkt.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Beschreibe dein Problem, z.B. 'Rechnung erstellen'…"
          className="pl-10 h-12 text-base"
          autoFocus
        />
        {searchQuery && (
          <p className="text-xs text-muted-foreground mt-1 ml-1">
            {totalResults} {totalResults === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden
          </p>
        )}
      </div>

      {/* Quick links */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2">
          {FAQ_DATA.map((cat) => (
            <Button
              key={cat.id}
              variant={expandedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
              className="gap-1.5"
            >
              <span>{cat.emoji}</span>
              {cat.title}
            </Button>
          ))}
        </div>
      )}

      {/* FAQ Accordion */}
      <div className="space-y-4">
        {filteredCategories.map((category) => {
          const isExpanded = searchQuery || expandedCategory === category.id;
          
          return (
            <div key={category.id}>
              {/* Category Header */}
              {!searchQuery && (
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                  className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-lg">{category.emoji}</span>
                  <span className="font-semibold text-foreground flex-1">{category.title}</span>
                  <Badge variant="secondary" className="text-xs">{category.items.length}</Badge>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}

              {/* Items */}
              {isExpanded && (
                <div className="space-y-2 mt-2 ml-1">
                  {category.items.map((item, idx) => {
                    const itemKey = `${category.id}-${idx}`;
                    const isItemExpanded = expandedItem === itemKey || !!searchQuery;

                    return (
                      <Card
                        key={idx}
                        className={`cursor-pointer transition-all ${isItemExpanded ? 'border-primary/30 shadow-sm' : 'hover:border-primary/20'}`}
                        onClick={() => setExpandedItem(isItemExpanded ? null : itemKey)}
                      >
                        <CardContent className="p-4">
                          {/* Question */}
                          <div className="flex items-center gap-2">
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${isItemExpanded ? 'rotate-90' : ''}`} />
                            <p className="font-medium text-sm text-foreground">{item.question}</p>
                          </div>

                          {/* Answer (expanded) */}
                          {isItemExpanded && (
                            <div className="mt-3 ml-6 space-y-3">
                              <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>

                              {/* Steps */}
                              {item.steps && (
                                <ol className="space-y-1.5">
                                  {item.steps.map((step, si) => (
                                    <li key={si} className="flex items-start gap-2 text-sm">
                                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                                        {si + 1}
                                      </span>
                                      <span className="text-muted-foreground">{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              )}

                              {/* Navigate CTA */}
                              {item.navigateTo && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 mt-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(item.navigateTo!);
                                  }}
                                >
                                  {item.navigateLabel || 'Direkt dorthin'}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Keine Ergebnisse gefunden</p>
            <p className="text-sm mt-1">Versuch es mit anderen Begriffen oder frag Hufi direkt.</p>
          </div>
        )}
      </div>

      {/* Video Help */}
      <div className="pt-4 border-t border-border">
        <VideoHelpSection videos={MODULE_VIDEOS} />
      </div>

      {/* Hufi CTA */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center space-y-3">
          <span className="text-3xl">🤖</span>
          <h3 className="font-semibold text-foreground">Antwort nicht gefunden?</h3>
          <p className="text-sm text-muted-foreground">
            Frag Hufi — unser KI-Assistent kennt das gesamte System und hilft dir sofort weiter.
          </p>
          <p className="text-xs text-muted-foreground">
            Tippe auf das <span className="text-primary">✨</span> Symbol unten rechts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
