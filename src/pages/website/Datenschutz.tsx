import Navbar from "@/components/website/Navbar";
import FooterNew from "@/components/website/FooterNew";

const Datenschutz = () => (
  <div className="min-h-screen bg-black">
    <Navbar />
    <main className="container py-24 md:py-32">
      <div className="max-w-3xl mx-auto prose prose-invert max-w-none">
        <h1 className="text-4xl font-bold mb-8 !mt-0 text-white">Datenschutzerklärung</h1>
        <section className="space-y-8 text-white/70 [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white">
          <div>
            <h2 className="text-2xl font-semibold mb-4">1. Datenschutz auf einen Blick</h2>
            <h3 className="text-xl font-semibold mb-2">Allgemeine Hinweise</h3>
            <p className="mb-4">Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.</p>
            <h3 className="text-xl font-semibold mb-2">Datenerfassung auf dieser Website</h3>
            <h4 className="text-lg font-semibold mb-2">Wer ist verantwortlich für die Datenerfassung auf dieser Website?</h4>
            <p className="mb-4">Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-4">2. Hosting</h2>
            <p className="mb-4">Wir hosten die Inhalte unserer Website bei folgenden Anbietern:</p>
            <h3 className="text-xl font-semibold mb-2">All-Inkl</h3>
            <p className="mb-4">Anbieter ist die ALL-INKL.COM - Neue Medien Münnich, Inh. René Münnich, Hauptstraße 68, 02742 Friedersdorf.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-4">3. Allgemeine Hinweise und Pflichtinformationen</h2>
            <h3 className="text-xl font-semibold mb-2">Hinweis zur verantwortlichen Stelle</h3>
            <p className="mb-4">
              Herr Pascal Schmid<br />
              Maienweg 1b<br />
              67659 Kaiserslautern<br />
              E-Mail: kontakt@barhufserviceschmid.de<br />
              Telefon: 015209007017
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-4">4. Datenerfassung auf dieser Website</h2>
            <h3 className="text-xl font-semibold mb-2">Cookies</h3>
            <p className="mb-4">Unsere Internetseiten verwenden so genannte „Cookies". Cookies sind kleine Datenpakete und richten auf Ihrem Endgerät keinen Schaden an.</p>
            <h3 className="text-xl font-semibold mb-2">Server-Log-Dateien</h3>
            <p className="mb-4">Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-4">5. HM Connect – Vernetzung & Datenaustausch</h2>
            <p className="mb-4">HufManager bietet mit „HM Connect" eine Funktion zur DSGVO-konformen Vernetzung zwischen Nutzern (Hufbearbeiter, Pferdebesitzer, Fachpartner). Die Vernetzung erfolgt ausschließlich über eindeutige, pseudonymisierte Kennungen (#PID, #KID, #PRID, #EQID).</p>
            <h3 className="text-xl font-semibold mb-2">Verbindungsanfragen</h3>
            <p className="mb-4">Bei einer Verbindungsanfrage werden Name und Kennung des Anfragenden dem Empfänger angezeigt. Personenbezogene Daten (E-Mail, Telefon, Adressen) werden erst nach beidseitiger Bestätigung der Verbindung gemäß Art. 6 Abs. 1 lit. a DSGVO geteilt. Jeder Nutzer kann erteilte Berechtigungen (Stammdaten, medizinische Daten, Terminplanung) jederzeit granular widerrufen.</p>
            <h3 className="text-xl font-semibold mb-2">Einladungen</h3>
            <p className="mb-4">Nutzer können Dritte per E-Mail-Adresse zum HufManager einladen. Die eingegebene E-Mail-Adresse wird ausschließlich zur Erstellung eines Einladungslinks verwendet und nach Ablauf (30 Tage) oder Annahme gelöscht. Es erfolgt kein automatischer E-Mail-Versand – der Nutzer teilt den Link eigenständig. Maximal 10 Einladungen pro Nutzer pro 24 Stunden sind möglich (Rate-Limiting).</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-4">6. Einsatz von Künstlicher Intelligenz</h2>
            <p className="mb-4">HufManager setzt KI-Modelle (Google Gemini) zur Unterstützung bei der Analyse von Hufbildern, automatisierten Textvorschlägen und Workflow-Automatisierung (AutoFlow) ein. Gemäß Art. 50 der EU KI-Verordnung (AI Act) werden alle KI-generierten Inhalte entsprechend gekennzeichnet. Die Verarbeitung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Das System wird als „Minimales Risiko" gemäß der KI-Verordnung eingestuft.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-4">7. Soziale Medien</h2>
            <p className="mb-4">Auf dieser Website sind Elemente sozialer Netzwerke (Facebook, Instagram) integriert. Die Nutzung erfolgt auf Grundlage Ihrer Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO.</p>
          </div>
          <div className="pt-4 text-sm border-t border-white/10">
            <p>Quelle: <a href="https://www.e-recht24.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">e-recht24.de</a></p>
          </div>
        </section>
      </div>
    </main>
    <FooterNew />
  </div>
);

export default Datenschutz;
