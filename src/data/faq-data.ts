export interface FAQItem {
  q: string;
  a: string;
}

export interface FAQCategory {
  category: string;
  icon: string;
  questions: FAQItem[];
}

export const FAQ_DATA: FAQCategory[] = [
  {
    category: "Pferdeakte",
    icon: "📋",
    questions: [
      { q: "Was ist die Pferdeakte?", a: "Die digitale Pferdeakte vereint alle Behandlungen, Befunde und Gesundheitsdaten deines Pferdes an einem Ort. Hufbearbeiter, Tierarzt, Osteopath und du als Besitzer – alle sehen die gleiche Akte." },
      { q: "Wer kann meine Pferdeakte sehen?", a: "Nur du und die Personen denen du Zugriff gegeben hast. Du bestimmst im Team-Tab genau wer was sehen darf." },
      { q: "Was kostet die Pferdeakte?", a: "Die Pferdeakte ist kostenlos. Der Premium-Tresor (Kaufverträge, Versicherungen, QR-Notfall) kostet 4,90€/Monat." },
    ],
  },
  {
    category: "Tresor",
    icon: "🔒",
    questions: [
      { q: "Was ist der Tresor?", a: "Ein PIN-geschützter Bereich für deine wichtigsten Dokumente: Kaufvertrag, Versicherung, Equidenpass. PostIdent-verifiziert." },
      { q: "Was passiert wenn ich meine PIN vergesse?", a: "Nach 3 Fehlversuchen wird der Tresor für 30 Minuten gesperrt. Kontaktiere den Support für eine PIN-Zurücksetzung." },
      { q: "Wie funktioniert der QR-Notfall-Code?", a: "Drucke den QR-Code aus und hänge ihn an den Stall oder das Halfter. Im Notfall kann jeder scannen und sieht Notfall-Kontakte, Tierarzt und Versicherung – ohne Login." },
    ],
  },
  {
    category: "Hufbearbeitung",
    icon: "🐴",
    questions: [
      { q: "Was bedeuten die Hufwerte?", a: "Zehenlänge (mm): Länge der Zehe. Hufwinkel (°): Winkel Zehenwand-Boden. Trachtenhöhe (mm): Höhe der Trachten. Diese Werte zeigen die Hufgesundheit über Zeit." },
      { q: "Wie funktioniert HufiAI?", a: "Sprich deinen Befund ins Mikrofon. Die KI wandelt deine Worte automatisch in einen strukturierten Befund um: Befund, Maßnahme, Empfehlung, Hufwerte." },
      { q: "Wie nutze ich den Foto-Vergleich?", a: "Wähle zwei Termine aus und ziehe den Slider. Du siehst sofort wie sich der Huf entwickelt hat." },
    ],
  },
  {
    category: "Team & Partner",
    icon: "👥",
    questions: [
      { q: "Wie lade ich einen Partner ein?", a: "Als Pferdebesitzer: Team-Tab → 'Dienstleister einladen'. Als Hufbearbeiter: Therapie-Tab → 'Fachpartner empfehlen' (der Besitzer entscheidet)." },
      { q: "Was ist die Team-Freigabe?", a: "Wenn du die Team-Freigabe aktivierst, können alle deine Dienstleister untereinander die Befunde sehen. Du kannst das jederzeit deaktivieren." },
      { q: "Kann mein Hufbearbeiter meine Daten an andere weitergeben?", a: "Nein. Nur du als Pferdebesitzer gibst Zugriff. Dein Hufbearbeiter kann Partner empfehlen, aber du entscheidest ob sie Zugriff bekommen." },
    ],
  },
  {
    category: "Berichte",
    icon: "📄",
    questions: [
      { q: "Was ist eine AKU-Mappe?", a: "Die AKU-Mappe (Ankaufsuntersuchung) enthält den vollständigen Gesundheitsverlauf deines Pferdes als PDF. Ideal für Pferdekauf oder Versicherungen." },
      { q: "Welche Berichte gibt es?", a: "Gesamtbericht, Huf-Bericht, Therapie-Bericht, Impfprotokoll und AKU-Mappe. Alle als PDF downloadbar." },
    ],
  },
  {
    category: "Konto & Datenschutz",
    icon: "🔐",
    questions: [
      { q: "Wo werden meine Daten gespeichert?", a: "Auf Servern in Deutschland (Hetzner). DSGVO-konform. Verschlüsselt. Row-Level-Security auf jeder Tabelle." },
      { q: "Kann ich meine Daten löschen?", a: "Ja. In den Einstellungen kannst du dein Konto und alle zugehörigen Daten löschen." },
      { q: "Was kostet Hufi?", a: "Für Pferdebesitzer: Kostenlos. Für Hufbearbeiter: Ab 19€/Monat (0-50 Pferde), 49€ (50-150), 99€ (150-350)." },
    ],
  },
];
