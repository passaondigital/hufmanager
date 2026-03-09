import Navbar from "@/components/website/Navbar";
import FooterNew from "@/components/website/FooterNew";

const Impressum = () => (
  <div className="min-h-screen bg-black">
    <Navbar />
    <main className="container py-24 md:py-32">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-white">Impressum</h1>
        <section className="space-y-6 text-white/70">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Angaben gemäß § 5 TMG</h2>
            <p>Pascal Schmid<br />(Barhufservice Schmid)<br />c/o Postflex #10643<br />Emsdettener Str. 10<br />48268 Greven</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Kontakt</h2>
            <p>Telefon: 015209007017<br />E-Mail: support@hufmanager.de</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Steuernummer</h2>
            <p>43/150/40518</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Umsatzsteuer</h2>
            <p>Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Gewerbeanmeldung</h2>
            <p>Die Gewerbeerlaubnis nach § 14 GewO oder § 55c GewO wurde am 15.08.2019 von folgender Stelle erteilt: Gemeinde Morbach.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Verantwortlich für den Inhalt</h2>
            <p>Verantwortlicher i.S.d. §18 Abs. 2 MStV: Pascal Schmid</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
            <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
          </div>
          <div className="pt-4 text-sm">
            <p>Quelle: <a href="https://www.e-recht24.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">e-recht24.de</a></p>
          </div>
        </section>
      </div>
    </main>
    <FooterNew />
  </div>
);

export default Impressum;
