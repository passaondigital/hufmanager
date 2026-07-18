import { MessageCircle } from "lucide-react";

const TestimonialsSection = () => (
  <section className="py-20 md:py-28 bg-black">
    <div className="container">
      <div className="max-w-2xl mx-auto text-center">
        <span className="text-[#F5970A] font-bold text-sm uppercase tracking-widest">Stimmen aus der Praxis</span>
        <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-6">
          Was Pferdeprofis sagen
        </h2>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 flex flex-col items-center gap-3">
          <MessageCircle className="h-8 w-8 text-[#F5970A]/50" />
          <p className="text-white/70 leading-relaxed">
            Bald teilen hier echte Nutzer ihre Erfahrungen.
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
