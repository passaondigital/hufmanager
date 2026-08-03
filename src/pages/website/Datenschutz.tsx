import Navbar from "@/components/website/Navbar";
import FooterNew from "@/components/website/FooterNew";

/*
 * ⚠️ eRecht24-GENERAT — LIZENZ AUSGELAUFEN.
 * Der Grundtext dieser Seite stammt aus dem eRecht24-Datenschutz-Generator
 * (vgl. Footer "Quelle: e-recht24.de" + Affiliate-Baustein). Die eRecht24-
 * Mitgliedschaft ist abgelaufen — die Weiterverwendung/Bearbeitung der Vorlage
 * ist damit lizenzrechtlich nicht mehr gedeckt.
 *
 * TODO: Datenschutztext über einen frei lizenzierten Generator NEU aufsetzen,
 *       z. B. https://datenschutz-generator.de (Dr. Schwenke, freie Lizenz).
 *       Vollständige Faktenbasis / Neuaufbau-Vorlage: docs/datenschutz-faktenbasis.md
 *
 * Bis dahin: die hier enthaltenen technischen Korrekturen (Abschnitt 8, Hosting,
 * neue Anschrift) sind ein TECHNISCHER ENTWURF, keine juristische Endfassung.
 */
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

          {/*
            TECHNISCHER ENTWURF — juristische Endfassung via eRecht24 ausstehend.
            Stand auf Basis von docs/datenschutz-faktenbasis.md (14.06.2026).
            Reale Infrastruktur: Hostinger VPS (Nginx, EU) + Supabase. ALL-INKL & Vercel
            werden NICHT mehr genutzt und wurden entfernt, damit der Text die Realität abbildet.
          */}
          {/* 2 */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">2. Hosting</h2>
            <p className="mb-4">Wir hosten die Inhalte unserer Website und die zugehörige Server-Infrastruktur bei folgenden Anbietern:</p>

            <h3 className="text-xl font-semibold mb-2">Hostinger (VPS)</h3>
            <p className="mb-4">Die Website sowie die ergänzende Server-Infrastruktur (u.&nbsp;a. Reverse-Proxy und selbst gehostete Verarbeitungsdienste, siehe Abschnitt 8) werden auf einem virtuellen Server (VPS) der Hostinger International Ltd., 61 Lordou Vironos Street, 6023 Larnaca, Zypern, betrieben. Die Server stehen innerhalb der EU. Beim Aufruf der Website werden technische Zugriffsdaten (u.&nbsp;a. IP-Adresse, Browsertyp, Betriebssystem, Uhrzeit des Zugriffs) in Server-Logs verarbeitet. Details entnehmen Sie der Datenschutzerklärung von Hostinger: <a href="https://www.hostinger.de/datenschutzrichtlinie" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.hostinger.de/datenschutzrichtlinie</a></p>
            <p className="mb-4">Die Verwendung von Hostinger erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer möglichst zuverlässigen Darstellung und Bereitstellung unserer Website und App. Sofern eine entsprechende Einwilligung abgefragt wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG. Die Einwilligung ist jederzeit widerrufbar.</p>

            <h4 className="text-lg font-semibold mb-2">Auftragsverarbeitung</h4>
            <p className="mb-4">Wir haben einen Vertrag über Auftragsverarbeitung (AVV) zur Nutzung der oben genannten Dienste geschlossen. Hierbei handelt es sich um einen datenschutzrechtlich vorgeschriebenen Vertrag, der gewährleistet, dass diese die personenbezogenen Daten unserer Websitebesucher nur nach unseren Weisungen und unter Einhaltung der DSGVO verarbeiten.</p>

            <h3 className="text-xl font-semibold mb-2">Externes Hosting</h3>
            <p className="mb-4">Diese Website wird extern gehostet. Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters / der Hoster gespeichert. Hierbei kann es sich v.&nbsp;a. um IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe und sonstige Daten, die über eine Website generiert werden, handeln.</p>
            <p className="mb-4">Wir setzen folgende(n) Hoster ein:</p>
            <p className="mb-2"><strong>Hostinger International Ltd.</strong><br />61 Lordou Vironos Street, 6023 Larnaca, Zypern<br />Betrieb des virtuellen Servers (VPS); die Server stehen innerhalb der EU.</p>
            <p className="mb-2"><strong>Supabase Inc.</strong> (Anbieter)<br />970 Trestle Glen Rd, Oakland, CA 94610, USA<br />Die Speicherung und Verarbeitung der App-Daten erfolgt in der Europäischen Union (Rechenzentrum Frankfurt, AWS eu-central-1). Mit Supabase besteht ein Auftragsverarbeitungsvertrag (AVV); für die Übermittlung an das US-Mutterunternehmen gelten die EU-Standardvertragsklauseln (SCC).</p>
          </div>

          {/* 3 */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">3. Allgemeine Hinweise und Pflichtinformationen</h2>
            <h3 className="text-xl font-semibold mb-2">Hinweis zur verantwortlichen Stelle</h3>
            <p className="mb-4">Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
            <p className="mb-4">
              Herr Pascal Schmid<br />
              Hauptstraße 19<br />
              54426 Talling<br />
              <a href="https://hufiapp.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.hufiapp.de</a><br />
              <a href="mailto:kontakt@hufiapp.de" className="text-primary hover:underline">kontakt@hufiapp.de</a><br />
              Telefon: 015209007017<br />
              E-Mail: <a href="mailto:kontakt@hufiapp.de" className="text-primary hover:underline">kontakt@hufiapp.de</a>
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
            <p className="mb-4">Auf der Website wird der KI-Assistent „Hufi" eingesetzt, der auf der Claude-API von Anthropic (Anthropic PBC, 548 Market St, PMB 90375, San Francisco, CA 94104, USA) basiert. Hufi beantwortet allgemeine Fragen zur Plattform Hufi (hufiapp.de) und unterstützt Nutzer bei der Orientierung auf der Website. Wenn Sie mit Hufi interagieren, werden Ihre Eingaben inklusive Metadaten verarbeitet, um eine passende Antwort zu generieren. Die Nutzung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.</p>

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

          {/*
            TECHNISCHER ENTWURF (Abschnitt 8) — juristische Endfassung via eRecht24 ausstehend.
            Quelle: docs/datenschutz-faktenbasis.md (14.06.2026).
            Listet die in der Hufi-App aktiv genutzten Drittdienste (Auftragsverarbeiter)
            sowie die self-hosted Sprachverarbeitung. AVV/SCC für die US-Dienste sind noch
            zu beschaffen bzw. zu verlinken (siehe Faktenbasis Abschnitt E).
          */}
          {/* 8 */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">8. Datenverarbeitung in der Hufi-App</h2>
            <p className="mb-4">Innerhalb der Anwendung (App-Bereich nach dem Login) setzen wir zur Bereitstellung einzelner Funktionen die folgenden externen Dienste als Auftragsverarbeiter ein. Es werden jeweils nur die für die Funktion erforderlichen Daten übermittelt (Grundsatz der Datenminimierung, Art. 5 Abs. 1 lit. c DSGVO). Der KI-Assistent (Anthropic, Claude) ist bereits in Abschnitt 4 beschrieben.</p>

            <h3 className="text-xl font-semibold mb-2">Selbst gehostete Sprachverarbeitung (keine Drittübermittlung)</h3>
            <p className="mb-4">Die Spracherkennung (Whisper), die Sprachausgabe (Piper) sowie ergänzende KI-Sprachmodelle (Ollama) werden ausschließlich auf unseren eigenen Servern innerhalb der EU betrieben. Sprachaufnahmen werden für die Transkription <strong>nicht an Dritte übermittelt</strong>, sondern unmittelbar auf der eigenen Infrastruktur verarbeitet. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO.</p>

            <h3 className="text-xl font-semibold mb-2">ElevenLabs (Sprachausgabe)</h3>
            <p className="mb-4"><strong>Anbieter:</strong> ElevenLabs Inc. (USA).<br /><strong>Verarbeitete Daten:</strong> der zur Sprachausgabe (Text-to-Speech) bestimmte Antworttext. Dieser <strong>kann personenbezogene Daten enthalten</strong> (z.&nbsp;B. Kunden- oder Pferdenamen), sofern sie Bestandteil der vorgelesenen Antwort sind.<br /><strong>Zweck:</strong> Vorlesen von Assistenz-Antworten.<br /><strong>Hinweis:</strong> Sprachaufnahmen (Spracherkennung) werden <strong>nicht</strong> an ElevenLabs übermittelt – diese erfolgt self-hosted (siehe oben). Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO; für die Übermittlung in die USA gelten EU-Standardvertragsklauseln (SCC).</p>

            <h3 className="text-xl font-semibold mb-2">Wetterdienst (wttr.in)</h3>
            <p className="mb-4"><strong>Anbieter:</strong> wttr.in (quelloffener Dienst).<br /><strong>Verarbeitete Daten:</strong> ein <strong>grober Standort auf Stadtebene</strong> (auf etwa 11&nbsp;km gerundete Koordinaten). Die exakten GPS-Koordinaten werden zum Schutz Ihrer Privatsphäre <strong>bewusst nicht</strong> übermittelt.<br /><strong>Zweck:</strong> Wetterkontext für die Tagesplanung.<br /><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO.</p>

            <h3 className="text-xl font-semibold mb-2">OpenRouteService (Routenoptimierung)</h3>
            <p className="mb-4"><strong>Anbieter:</strong> HeiGIT gGmbH, Heidelberg, Deutschland.<br /><strong>Verarbeitete Daten:</strong> Adressen bzw. Koordinaten der anzufahrenden Termine.<br /><strong>Zweck:</strong> Berechnung und Optimierung der Tagesroute.<br /><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b und f DSGVO. EU-Anbieter.</p>

            <h3 className="text-xl font-semibold mb-2">OpenStreetMap / Nominatim (Geocoding)</h3>
            <p className="mb-4"><strong>Anbieter:</strong> OpenStreetMap Foundation (EU/UK).<br /><strong>Verarbeitete Daten:</strong> Kunden-Adressen.<br /><strong>Zweck:</strong> Umwandlung von Adressen in Geokoordinaten (Geocoding) als Grundlage für Karten- und Routenfunktionen.<br /><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO.</p>

            <h3 className="text-xl font-semibold mb-2">Tankerkönig (Spritpreise)</h3>
            <p className="mb-4"><strong>Anbieter:</strong> Tankerkönig (creativecommons.tankerkoenig.de), Deutschland.<br /><strong>Verarbeitete Daten:</strong> Standortkoordinaten zur Umkreissuche.<br /><strong>Zweck:</strong> Anzeige aktueller Kraftstoffpreise in der Nähe bzw. entlang der Route zur Reisekostenkalkulation.<br /><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO. EU-Anbieter.</p>

            <h3 className="text-xl font-semibold mb-2">Resend (E-Mail-Versand)</h3>
            <p className="mb-4"><strong>Anbieter:</strong> Resend Inc. (USA).<br /><strong>Verarbeitete Daten:</strong> E-Mail-Adressen der Empfänger sowie die Inhalte der versendeten Nachrichten (z.&nbsp;B. Rechnungen, Benachrichtigungen).<br /><strong>Zweck:</strong> transaktionaler E-Mail-Versand.<br /><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO; für die Übermittlung in die USA gelten EU-Standardvertragsklauseln (SCC).</p>

            <h3 className="text-xl font-semibold mb-2">Ihre in der App gespeicherten Daten einsehen &amp; löschen</h3>
            <p className="mb-4">Der KI-Assistent „Hufi" speichert zur Personalisierung bestimmte Informationen über Sie und Ihren Betrieb. Sie können diese gespeicherten Inhalte jederzeit in der App unter <strong>Einstellungen → KI</strong> bzw. direkt unter <strong>„/hufi/memory"</strong> einsehen und löschen (Art. 15 und Art. 17 DSGVO).</p>
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
