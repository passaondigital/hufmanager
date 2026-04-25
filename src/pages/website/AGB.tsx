import Navbar from "@/components/website/Navbar";
import FooterNew from "@/components/website/FooterNew";

const AGB = () => (
  <div className="min-h-screen bg-black">
    <Navbar />
    <main className="container py-24 md:py-32">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-white">Allgemeine Geschäftsbedingungen</h1>
        <p className="text-white/60 mb-10 leading-relaxed">
          für die Erbringung von Dienstleistungen von Barhufserviceschmid, Emsdettener Str. 10, c/o Postflex #10643, 48268 Greven, E-Mail: kontakt@hufiapp.de (nachfolgend „Auftragnehmer") gegenüber seinen Kunden (nachfolgend „Auftraggeber")
        </p>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-10 text-white/70 text-sm leading-relaxed">

          {/* §1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">1. Allgemeines</h2>
            <p>1.1 Diese Allgemeinen Geschäftsbedingungen (AGB) für die Erbringung von Dienstleistungen gelten für Verträge, die zwischen dem Auftraggeber und dem Auftragnehmer unter Einbeziehung dieser AGB geschlossen werden.</p>
            <p>1.2 Soweit neben diesen AGB weitere Vertragsdokumente oder andere Geschäftsbedingungen in Text- oder Schriftform Vertragsbestandteil geworden sind, gehen die Regelungen dieser weiteren Vertragsdokumente im Widerspruchsfalle den vorliegenden AGB vor.</p>
            <p>1.3 Von diesen Geschäftsbedingungen abweichende AGB, die durch den Auftraggeber verwendet werden, erkennt Auftragnehmer – vorbehaltlich einer ausdrücklichen Zustimmung – nicht an.</p>
          </section>

          {/* §2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">2. Vertragsgegenstand und Leistungsumfang</h2>
            <p>2.1 Der Auftragnehmer erbringt als selbständiger Unternehmer folgende Leistungen gegenüber dem Auftraggeber:</p>
            <p>HufManager ist eine webbasierte SaaS-Plattform für das Hufpflegemanagement. Die Plattform ermöglicht Hufbearbeitern, Tierärzten, Physiotherapeuten und Pferdebesitzern die digitale Verwaltung von Terminen, Behandlungen, Pferdeakten und Kundendaten.</p>
            <p>2.2 Der spezifische Leistungsumfang ist Gegenstand von Individualvereinbarungen zwischen Auftragnehmer und dem Auftraggeber.</p>
            <p>2.3 Der Auftragnehmer erbringt die vertragsgemäßen Leistungen mit größtmöglicher Sorgfalt und Gewissenhaftigkeit nach dem jeweils neuesten Stand, neuesten Regeln und Erkenntnissen.</p>
            <p>2.4 Der Auftragnehmer ist zur Erbringung der vertragsgemäß geschuldeten Leistungen verpflichtet. Bei der Durchführung seiner Tätigkeit ist er jedoch etwaigen Weisungen im Hinblick auf die Art der Erbringung seiner Leistungen nicht unterworfen. Die Leistungserbringung durch den Auftragnehmer erfolgt lediglich in Abstimmung und in Koordination mit dem Auftraggeber.</p>
          </section>

          {/* §3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">3. Mitwirkungspflichten des Auftraggebers</h2>
            <p>Es obliegt dem Auftraggeber, die von ihm zum Zwecke der Leistungserfüllung zur Verfügung zu stellenden Informationen, Daten und sonstigen Inhalte vollständig und korrekt mitzuteilen. Für Verzögerungen bei der Leistungserbringung, die durch eine verspätete notwendige Mitwirkung des Kunden entstehen, ist der Auftragnehmer gegenüber dem Kunden in keinerlei Hinsicht verantwortlich.</p>
          </section>

          {/* §4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">4. Vergütung</h2>
            <p>4.1 Die Vergütung wird individualvertraglich vereinbart.</p>
            <p>4.2 Die Vergütung ist nach der Leistung der Dienste zu entrichten. Ist die Vergütung nach Zeitabschnitten bemessen, so ist sie nach dem Ablauf der einzelnen Zeitabschnitte zu entrichten (§ 614 BGB).</p>
            <p>4.3 Der Auftragnehmer stellt dem Auftraggeber nach Erbringung der Leistungen eine Rechnung per Post oder per E-Mail. Die Vergütung ist innerhalb von 14 Tagen nach Zugang der Rechnung zur Zahlung fällig.</p>
          </section>

          {/* §5 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">5. Haftung / Freistellung</h2>
            <p>5.1 Der Auftragnehmer haftet aus jedem Rechtsgrund uneingeschränkt bei Vorsatz oder grober Fahrlässigkeit, bei vorsätzlicher oder fahrlässiger Verletzung des Lebens, des Körpers oder der Gesundheit, aufgrund eines Garantieversprechens oder aufgrund zwingender Haftung. Verletzt der Auftragnehmer fahrlässig eine wesentliche Vertragspflicht, ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist eine Haftung des Auftragnehmers ausgeschlossen.</p>
            <p>5.2 Der Auftraggeber stellt den Auftragnehmer von jeglichen Ansprüchen Dritter frei, die gegen den Auftragnehmer aufgrund von Verstößen des Kunden gegen diese Vertragsbedingungen oder gegen geltendes Recht geltend gemacht werden.</p>
          </section>

          {/* §6 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">6. Vertragsdauer und Kündigung</h2>
            <p>6.1 Die Vertragsdauer und die Fristen zur ordentlichen Kündigung vereinbaren die Parteien individuell.</p>
            <p>6.2 Das Recht beider Parteien zur fristlosen Kündigung aus wichtigem Grund bleibt unberührt.</p>
            <p>6.3 Der Auftragnehmer hat alle ihm überlassenen Unterlagen und sonstigen Inhalte nach Vertragsbeendigung unverzüglich nach Wahl des Kunden zurückzugeben oder zu vernichten. Elektronische Daten sind vollständig zu löschen.</p>
          </section>

          {/* §7 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">7. Vertraulichkeit und Datenschutz</h2>
            <p>7.1 Der Auftragnehmer wird alle ihm im Zusammenhang mit dem Auftrag zur Kenntnis gelangenden Vorgänge streng vertraulich behandeln. Die Geheimhaltungspflicht gilt zeitlich unbegrenzt über die Dauer dieses Vertrages hinaus.</p>
            <p>7.2 Der Auftragnehmer verpflichtet sich, bei der Durchführung des Auftrags sämtliche datenschutzrechtlichen Vorschriften – insbesondere die Vorschriften der Datenschutzgrundverordnung und des Bundesdatenschutzgesetzes – einzuhalten.</p>
          </section>

          {/* §8 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">8. Schlussbestimmungen</h2>
            <p>8.1 Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des CISG.</p>
            <p>8.2 Sollte eine Bestimmung dieser AGB unwirksam sein oder werden, so wird die Gültigkeit der AGB im Übrigen hiervon nicht berührt.</p>
            <p>8.3 Der Auftraggeber wird den Auftragnehmer bei der Erbringung seiner vertragsgemäßen Leistungen durch angemessene Mitwirkungshandlungen fördern.</p>
            <p>8.4 Sofern der Auftraggeber Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist oder keinen allgemeinen Gerichtsstand in Deutschland hat, vereinbaren die Parteien den Sitz des Auftragnehmers als Gerichtsstand für sämtliche Streitigkeiten aus diesem Vertragsverhältnis.</p>
            <p>8.5 Der Auftragnehmer ist berechtigt, diese AGB aus sachlich gerechtfertigten Gründen und unter Einhaltung einer angemessenen Frist zu ändern. Bestandskunden werden hierüber spätestens zwei Wochen vor Inkrafttreten der Änderung per E-Mail benachrichtigt.</p>
          </section>

          {/* §9 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">9. Informationen zur Online-Streitbeilegung / Verbraucherschlichtung</h2>
            <p>
              Die EU-Kommission stellt im Internet unter folgendem Link eine Plattform zur Online-Streitbeilegung bereit:{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#F5970A] underline">
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
            <p>Diese Plattform dient als Anlaufstelle zur außergerichtlichen Beilegung von Streitigkeiten aus Online-Kauf- oder Dienstleistungsverträgen, an denen ein Verbraucher beteiligt ist. Der Anbieter ist weder bereit noch verpflichtet, an einem Verbraucherstreitschlichtungsverfahren nach dem VSBG teilzunehmen.</p>
            <p>Unsere E-Mail-Adresse entnehmen Sie der Überschrift dieser AGB.</p>
          </section>

        </div>
      </div>
    </main>
    <FooterNew />
  </div>
);

export default AGB;
