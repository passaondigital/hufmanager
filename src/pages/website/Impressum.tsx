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
            <p>Pascal Schmid<br />Barhufserviceschmid<br />Laurentiusstrasse 34<br />54497 Morscheid Riedenburg</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Kontakt</h2>
            <p>Telefon: 015209007017<br />E-Mail: teamhufmanager@gmail.com</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Gewerbeanmeldung</h2>
            <p>Die Gewerbeerlaubnis nach § 14 GewO oder § 55c GewO wurde am 15.08.2019 von folgender Stelle erteilt: Gemeinde Morbach.</p>
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
