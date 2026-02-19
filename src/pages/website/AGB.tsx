import Navbar from "@/components/website/Navbar";
import FooterNew from "@/components/website/FooterNew";

const AGB = () => (
  <div className="min-h-screen bg-black">
    <Navbar />
    <main className="container py-24 md:py-32">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-white">Allgemeine Geschäftsbedingungen</h1>
        <section className="space-y-6 text-white/70">
          <p>Die Abwicklung der Zahlungen und die Rechnungsstellung für unsere Produkte erfolgt über unseren Reseller:</p>
          <address className="not-italic">
            <strong className="text-white">CopeCart GmbH</strong><br />
            Ufnaustraße 10<br />
            10553 Berlin
          </address>
          <p>Für den Kaufabschluss gelten die Allgemeinen Geschäftsbedingungen (AGB) der CopeCart GmbH, die Sie im Checkout-Prozess einsehen können.</p>
          <p>Ergänzend gelten für die Nutzung der Software "HufManager" unsere Nutzungsbedingungen.</p>
        </section>
      </div>
    </main>
    <FooterNew />
  </div>
);

export default AGB;
