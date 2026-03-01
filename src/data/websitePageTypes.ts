export interface WebsitePageType {
  id: string;
  slug: string;
  label: string;
  description: string;
  icon: string;
  required: boolean;
  defaultEnabled: boolean;
}

export const WEBSITE_PAGE_TYPES: WebsitePageType[] = [
  { id: "home", slug: "", label: "Startseite", description: "Deine Hauptseite mit allen Sektionen", icon: "🏠", required: true, defaultEnabled: true },
  { id: "about", slug: "ueber-mich", label: "Über mich", description: "Persönliche Vorstellung & Qualifikationen", icon: "👤", required: false, defaultEnabled: false },
  { id: "services", slug: "leistungen", label: "Leistungen & Preise", description: "Detaillierte Leistungsübersicht", icon: "⚙️", required: false, defaultEnabled: false },
  { id: "gallery", slug: "galerie", label: "Foto-Galerie", description: "Bilder deiner Arbeit", icon: "📸", required: false, defaultEnabled: false },
  { id: "blog", slug: "blog", label: "Blog / Neuigkeiten", description: "Artikel & Fachwissen", icon: "📝", required: false, defaultEnabled: false },
  { id: "contact", slug: "kontakt", label: "Kontaktseite", description: "Intelligentes Kontaktformular", icon: "📬", required: true, defaultEnabled: true },
  { id: "booking", slug: "termin", label: "Termin buchen", description: "Direktbuchung", icon: "📅", required: false, defaultEnabled: false },
  { id: "team", slug: "team", label: "Mein Team", description: "Teammitglieder vorstellen", icon: "👥", required: false, defaultEnabled: false },
  { id: "reviews", slug: "referenzen", label: "Bewertungen", description: "Kundenstimmen & Referenzen", icon: "⭐", required: false, defaultEnabled: false },
  { id: "impressum", slug: "impressum", label: "Impressum", description: "Automatisch generiert", icon: "📄", required: true, defaultEnabled: true },
  { id: "datenschutz", slug: "datenschutz", label: "Datenschutz", description: "Automatisch generiert", icon: "🔒", required: true, defaultEnabled: true },
];

export const BLOG_CATEGORIES = [
  { value: "hufpflege", label: "Hufpflege" },
  { value: "gesundheit", label: "Gesundheit" },
  { value: "tipps", label: "Tipps & Tricks" },
  { value: "news", label: "Neuigkeiten" },
  { value: "events", label: "Events" },
];

export const STARTER_BLOG_POSTS = [
  {
    title: "Warum regelmäßige Hufpflege so wichtig ist",
    slug: "regelmaessige-hufpflege-wichtig",
    category: "hufpflege",
    excerpt: "Die Hufe sind das Fundament deines Pferdes. Erfahre warum regelmäßige Pflege entscheidend ist.",
    content: `<h2>Die Hufe — das Fundament deines Pferdes</h2>
<p>Ohne gesunde Hufe kann kein Pferd langfristig gesund bleiben. Die Hufe tragen das gesamte Gewicht und müssen enormen Belastungen standhalten.</p>
<h3>Wie oft sollte der Hufpfleger kommen?</h3>
<p>Als Faustregel gilt: alle 6-8 Wochen. Je nach Hufwachstum, Haltung und Nutzung kann der Intervall aber variieren. Ich berate dich gerne individuell.</p>
<h3>Was passiert wenn man zu lange wartet?</h3>
<p>Zu lange Intervalle können zu Fehlstellungen, Rissen und Lahmheiten führen. Regelmäßigkeit ist der Schlüssel zur Hufgesundheit.</p>`,
  },
  {
    title: "Was passiert bei einem Termin bei mir",
    slug: "ablauf-termin-hufpflege",
    category: "tipps",
    excerpt: "Ein typischer Hufpflege-Termin dauert 45-90 Minuten. So läuft er ab.",
    content: `<h2>So läuft ein Termin ab</h2>
<p>Viele Pferdebesitzer fragen sich was genau bei einem Hufpflege-Termin passiert. Hier ein Überblick.</p>
<h3>1. Begrüßung & Bestandsaufnahme</h3>
<p>Zuerst schaue ich mir das Pferd im Stand und in der Bewegung an. Gibt es Auffälligkeiten?</p>
<h3>2. Die Bearbeitung</h3>
<p>Je nach Bedarf wird ausgeschnitten, geraspt und korrigiert. Dabei arbeite ich ruhig und pferdefreundlich.</p>
<h3>3. Dokumentation & Besprechung</h3>
<p>Ich dokumentiere alles digital — du bekommst Fotos und Befunde direkt in deine HufManager-App.</p>`,
  },
  {
    title: "So bereitest du dein Pferd auf den Besuch vor",
    slug: "pferd-auf-hufpfleger-vorbereiten",
    category: "tipps",
    excerpt: "Mit diesen einfachen Tipps machst du den Termin stressfrei für alle Beteiligten.",
    content: `<h2>Vorbereitung ist alles</h2>
<p>Ein gut vorbereitetes Pferd macht den Termin für alle angenehmer — für dich, dein Pferd und mich.</p>
<h3>Vor dem Termin</h3>
<ul>
<li>Pferd trocken und sauber anbinden</li>
<li>Hufe grob von Matsch befreien</li>
<li>Ruhigen, ebenen Platz vorbereiten</li>
<li>Halfter und Strick bereithalten</li>
</ul>
<h3>Während des Termins</h3>
<p>Bitte bleib in der Nähe. Falls das Pferd unruhig wird, brauche ich deine Unterstützung.</p>`,
  },
];
