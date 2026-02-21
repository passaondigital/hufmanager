import { PublicDemoRequestForm } from "@/components/funnel/PublicDemoRequestForm";

const ContactFormSection = () => (
  <section id="kontakt" className="py-16 md:py-24 bg-zinc-950">
    <div className="container">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <span className="text-primary font-bold text-sm uppercase tracking-widest">Kontakt & Demo</span>
        <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-white mt-4">
          Persönliche Vorführung oder Frage? Wir sind für dich da.
        </h2>
        <p className="text-white/50 mt-3 max-w-xl mx-auto">
          Wähle einen Wunschtermin und wir melden uns innerhalb von 24 Stunden bei dir – telefonisch oder per Videocall.
        </p>
      </div>
      <PublicDemoRequestForm />
    </div>
  </section>
);

export default ContactFormSection;
