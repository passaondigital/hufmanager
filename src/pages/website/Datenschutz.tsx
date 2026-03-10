import Navbar from "@/components/website/Navbar";
import FooterNew from "@/components/website/FooterNew";

const Datenschutz = () => (
  <div className="min-h-screen bg-black">
    <Navbar />
    <main className="container py-24 md:py-32">
      <div className="max-w-3xl mx-auto prose prose-invert max-w-none">
        <h1 className="text-4xl font-bold mb-8 !mt-0 text-white">Datenschutzerklärung</h1>
        <section className="space-y-8 text-white/70 [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white">

          {/* 1 */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">1. Datenschutz auf einen Blick</h2>
            <h3 className="text-xl font-semibold mb-2">Allgemeine Hinweise</h3>
            <p className="mb-4">Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.</p>

            <h3 className="text-xl font-semibold mb-2">Datenerfassung auf dieser Website</h3>
            <h4 className="text-lg font-semibold mb-2">Wer ist verantwortlich für die Datenerfassung auf dieser Website?</h4>
            <p className="mb-4">Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen.</p>

            <h4 className="text-lg font-semibold mb-2">Wie erfassen wir Ihre Daten?</h4>
            <p className="mb-4">Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z.&nbsp;B. um Daten handeln, die Sie in ein Kontaktformular eingeben.</p>
            <p className="mb-4">Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z.&nbsp;B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald Sie diese Website betreten.</p>

            <h4 className="text-lg font-semibold mb-2">Wofür nutzen wir Ihre Daten?</h4>
            <p className="mb-4">Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden. Sofern über die Website Verträge geschlossen oder angebahnt werden können, werden die übermittelten Daten auch für Vertragsangebote, Bestellungen oder sonstige Auftragsanfragen verarbeitet.</p>

            <h4 className="text-lg font-semibold mb-2">Welche Rechte haben Sie bezüglich Ihrer Daten?</h4>
            <p className="mb-4">Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter bestimmten Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.</p>
            <p className="mb-4">Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit an uns wenden.</p>
          </div>

          {/* 2 */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">2. Hosting</h2>
            <p className="mb-4">Wir hosten die Inhalte unserer Website bei folgenden Anbietern:</p>

            <h3 className="text-xl font-semibold mb-2">All-Inkl</h3>
            <p className="mb-4">Anbieter ist die ALL-INKL.COM - Neue Medien Münnich, Inh. René Münnich, Hauptstraße 68, 02742 Friedersdorf (nachfolgend All-Inkl). Details entnehmen Sie der Datenschutzerklärung von All-Inkl: <a href="https://all-inkl.com/datenschutzinformationen/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://all-inkl.com/datenschutzinformationen/</a></p>
            <p className="mb-4">Die Verwendung von All-Inkl erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer möglichst zuverlässigen Darstellung unserer Website. Sofern eine entsprechende Einwilligung abgefragt wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG. Die Einwilligung ist jederzeit widerrufbar.</p>

            <h4 className="text-lg font-semibold mb-2">Auftragsverarbeitung</h4>
            <p className="mb-4">Wir haben einen Vertrag über Auftragsverarbeitung (AVV) zur Nutzung des oben genannten Dienstes geschlossen. Hierbei handelt es sich um einen datenschutzrechtlich vorgeschriebenen Vertrag, der gewährleistet, dass dieser die personenbezogenen Daten unserer Websitebesucher nur nach unseren Weisungen und unter Einhaltung der DSGVO verarbeitet.</p>

            <h3 className="text-xl font-semibold mb-2">Externes Hosting</h3>
            <p className="mb-4">Diese Website wird extern gehostet. Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters / der Hoster gespeichert. Hierbei kann es sich v.&nbsp;a. um IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe und sonstige Daten, die über eine Website generiert werden, handeln.</p>
            <p className="mb-4">Wir setzen folgende(n) Hoster ein:</p>
            <p className="mb-2"><strong>ALL-INKL.COM – Neue Medien Münnich</strong><br />Inh. René Münnich, Hauptstraße 68, 02742 Friedersdorf, Deutschland</p>
            <p className="mb-2"><strong>Supabase Inc.</strong><br />970 Trestle Glen Rd, Oakland, CA 94610, USA</p>
            <p className="mb-4"><strong>Vercel Inc.</strong><br />340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
          </div>

          {/* 3 */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">3. Allgemeine Hinweise und Pflichtinformationen</h2>
            <h3 className="text-xl font-semibold mb-2">Hinweis zur verantwortlichen Stelle</h3>
            <p className="mb-4">Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
            <p className="mb-4">
              Herr Pascal Schmid<br />
              c/o Postflex #10643<br />
              Emsdettener Str. 10<br />
              48268 Greven<br />
              <a href="https://www.hufmanager.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.hufmanager.de</a><br />
              <a href="mailto:support@hufmanager.de" className="text-primary hover:underline">support@hufmanager.de</a><br />
              Telefon: 015209007017<br />
              E-Mail: <a href="mailto:support@hufmanager.de" className="text-primary hover:underline">support@hufmanager.de</a>
            </p>

            <h3 className="text-xl font-semibold mb-2">SSL- bzw. TLS-Verschlüsselung</h3>
            <p className="mb-4">Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine SSL- bzw. TLS-Verschlüsselung.</p>

            <h3 className="text-xl font-semibold mb-2">Verschlüsselter Zahlungsverkehr auf dieser Website</h3>
            <p className="mb-4">Der Zahlungsverkehr über die gängigen Zahlungsmittel erfolgt ausschließlich über eine verschlüsselte SSL- bzw. TLS-Verbindung.</p>
          </div>

          {/* 4 */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">4. Datenerfassung auf dieser Website</h2>

            <h3 className="text-xl font-semibold mb-2">Cookies</h3>
            <p className="mb-4">Unsere Internetseiten verwenden sogenannte „Cookies". Cookies sind kleine Datenpakete und richten auf Ihrem Endgerät keinen Schaden an. Cookies, die zur Durchführung des elektronischen Kommunikationsvorgangs oder zur Bereitstellung bestimmter, von Ihnen erwünschter Funktionen erforderlich sind, werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert.</p>

            <h3 className="text-xl font-semibold mb-2">Server-Log-Dateien</h3>
            <p className="mb-4">Der Provider der Seiten erhebt und speichert automatisch Informationen in sogenannten Server-Log-Dateien: Browsertyp und Browserversion, verwendetes Betriebssystem, Referrer URL, Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage, IP-Adresse.</p>

            <h3 className="text-xl font-semibold mb-2">Kontaktformular</h3>
            <p className="mb-4">Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.</p>

            <h3 className="text-xl font-semibold mb-2">Einsatz von KI auf der Website</h3>
            <p className="mb-4">Auf der Website wird der KI-Assistent „Hufi" eingesetzt, der auf der Claude-API von Anthropic (Anthropic PBC, 548 Market St, PMB 90375, San Francisco, CA 94104, USA) basiert. Hufi beantwortet allgemeine Fragen zur Plattform HufManager und unterstützt Nutzer bei der Orientierung auf der Website. Wenn Sie mit Hufi interagieren, werden Ihre Eingaben inklusive Metadaten verarbeitet, um eine passende Antwort zu generieren. Die Nutzung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.</p>

            <h3 className="text-xl font-semibold mb-2">Einsatz von KI zur Beantwortung von Kundenanfragen</h3>
            <p className="mb-4">Wir setzen KI-gestützte Software zur Bearbeitung und Beantwortung von Kundenanfragen ein. Die Verwendung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.</p>

            <h3 className="text-xl font-semibold mb-2">Anfrage per E-Mail, Telefon oder Telefax</h3>
            <p className="mb-4">Wenn Sie uns per E-Mail, Telefon oder Telefax kontaktieren, wird Ihre Anfrage inklusive aller daraus hervorgehenden personenbezogenen Daten zum Zwecke der Bearbeitung Ihres Anliegens bei uns gespeichert und verarbeitet. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.</p>
          </div>

          {/* 5 */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">5. Plugins und Tools</h2>

            <h3 className="text-xl font-semibold mb-2">Google Fonts</h3>
            <p className="mb-4">Diese Seite nutzt zur einheitlichen Darstellung von Schriftarten Google Fonts. Beim Aufruf einer Seite lädt Ihr Browser die benötigten Fonts in ihren Browsercache. Zu diesem Zweck muss der von Ihnen verwendete Browser Verbindung zu den Servern von Google aufnehmen. Weitere Informationen: <a href="https://policies.google.com/privacy?hl=de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://policies.google.com/privacy?hl=de</a></p>
          </div>

          {/* 6 */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">6. eCommerce und Zahlungsanbieter</h2>

            <h3 className="text-xl font-semibold mb-2">CopeCart</h3>
            <p className="mb-4">Anbieter dieses Zahlungsdienstes ist CopeCart GmbH, Ufnaustraße 10, 10553 Berlin. Details entnehmen Sie der Datenschutzerklärung von CopeCart: <a href="https://www.copecart.com/de/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.copecart.com/de/datenschutz</a></p>
          </div>

          {/* 7 */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">7. Online-Marketing und Partnerprogramme</h2>

            <h3 className="text-xl font-semibold mb-2">eRecht24 Affiliate-Programm</h3>
            <p className="mb-4">Wir nehmen am Affiliate-Programm von eRecht24 GmbH &amp; Co KG, Lietzenburger Str. 94, 10719 Berlin teil. Wenn Sie auf einen eRecht24-Affiliate-Link klicken, werden Sie zunächst an den Zahlungsdienstleister Digistore24 weitergeleitet, der mithilfe einer Wiedererkennungstechnologie vermerkt, dass Sie über unsere Website zu den eRecht24-Angeboten gelangt sind.</p>
          </div>

          <div className="pt-4 text-sm border-t border-white/10 flex flex-col gap-2">
            <p>Zuletzt aktualisiert: {new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</p>
            <p>Quelle: <a href="https://www.e-recht24.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">e-recht24.de</a></p>
          </div>
        </section>
      </div>
    </main>
    <FooterNew />
  </div>
);

export default Datenschutz;
