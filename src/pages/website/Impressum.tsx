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
            <p>
              Pascal Schmid<br />
              Barhufserviceschmid<br />
              Emsdettener Str. 10<br />
              c/o Postflex #10643<br />
              48268 Greven
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Kontakt</h2>
            <p>
              Telefon: 015209007017<br />
              E-Mail: support@hufmanager.de
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Umsatzsteuer-ID</h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br /><br />
              Steuernummer: 43/150/40518<br /><br />
              Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Gewerbeanmeldung</h2>
            <p>
              Die Gewerbeerlaubnis nach § 14 GewO wurde am 15.08.2019 von folgender Stelle erteilt: Gemeinde Morbach.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Redaktionell verantwortlich</h2>
            <p>
              Pascal Schmid<br />
              c/o Postflex #10643<br />
              Emsdettener Str. 10<br />
              48268 Greven
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Verbraucherstreitbeilegung</h2>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </div>
        </section>
      </div>
    </main>
    <FooterNew />
  </div>
);

export default Impressum;
