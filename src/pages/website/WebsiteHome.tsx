import { useEffect } from "react";
import Navbar from "@/components/website/Navbar";
import { useGA4 } from "@/hooks/useGA4";
import HeroMinimal from "@/components/website/HeroMinimal";
import PainCardsSection from "@/components/website/PainCardsSection";
import EcosystemHeader from "@/components/website/EcosystemMinimal";
import HorseEcosystem from "@/components/website/HorseEcosystem";
import { DataSovereigntyBadge } from "@/components/shared/DataSovereigntyBadge";
import BigPictureSection from "@/components/website/BigPictureSection";
import WhyHufManagerSection from "@/components/website/WhyHufManagerSection";
import PricingV2 from "@/components/website/PricingV2";
import TestimonialsSection from "@/components/website/TestimonialsSection";
import FinalCTA from "@/components/website/FinalCTA";
import FooterNew from "@/components/website/FooterNew";
import CookieBanner from "@/components/website/CookieBanner";

const WebsiteHome = () => {
  useGA4();

  useEffect(() => {
    document.title = "HufManager – Software für Hufpflegeprofis";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Die Praxissoftware für Barhufpfleger & Hufschmiede. Termine, Befunde, Rechnungen, Website – alles in einem. Jetzt 14 Tage kostenlos.");
    }
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.setAttribute("name", "keywords");
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute("content", "Hufbearbeiter App, Pferdeosteopath App, Pferdephysiotherapeut Software, Equine Dentist Tool, mobile Pferdeprofis, digitales Fahrtenbuch Pferd, Terminplanung Pferdeprofis, Hufpflege Software, Tourenplanung Pferde, Reitlehrer Software, Sattler App");

    // Schema.org JSON-LD
    const existingLd = document.querySelector('script[data-huf-schema]');
    if (!existingLd) {
      const ldScript = document.createElement("script");
      ldScript.type = "application/ld+json";
      ldScript.setAttribute("data-huf-schema", "true");
      ldScript.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "HufManager",
        "description": "Die Praxissoftware für Hufpflegeprofis",
        "url": "https://hufmanager.de",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, iOS, Android",
        "offers": {
          "@type": "AggregateOffer",
          "lowPrice": "9.90",
          "highPrice": "79.00",
          "priceCurrency": "EUR"
        },
        "author": {
          "@type": "Person",
          "name": "Pascal Schmid"
        }
      });
      document.head.appendChild(ldScript);
    }

    return () => {
      const ldScript = document.querySelector('script[data-huf-schema]');
      if (ldScript) ldScript.remove();
    };
  }, []);

  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      {/* 1. Hero */}
      <HeroMinimal />
      {/* 2. Drei Schmerzen */}
      <PainCardsSection />
      {/* 3. Ökosystem */}
      <EcosystemHeader />
      <HorseEcosystem />
      {/* 4. Datensouveränität */}
      <section className="py-16 bg-zinc-950">
        <div className="container max-w-3xl">
          <DataSovereigntyBadge />
        </div>
      </section>
      {/* 5. Das große Ganze */}
      <BigPictureSection />
      {/* 6. Gründer + Szenarien + Historisch */}
      <WhyHufManagerSection />
      {/* 7. Preise */}
      <PricingV2 />
      {/* 8. Social Proof */}
      <TestimonialsSection />
      {/* 9. Finaler CTA */}
      <FinalCTA />
      {/* 10. Footer */}
      <FooterNew />
      <CookieBanner />
    </main>
  );
};

export default WebsiteHome;
