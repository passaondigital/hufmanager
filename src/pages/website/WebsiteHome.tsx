import { useEffect } from "react";
import Navbar from "@/components/website/Navbar";
import { useGA4 } from "@/hooks/useGA4";
import HeroV2 from "@/components/website/HeroV2";
import ProblemSection from "@/components/website/ProblemSection";
import PainSolutionSection from "@/components/website/PainSolutionSection";
import IdentitySection from "@/components/website/IdentitySection";
import HorseEcosystem from "@/components/website/HorseEcosystem";
import SolutionSection from "@/components/website/SolutionSection";
import FeatureCockpitSection from "@/components/website/FeatureCockpitSection";
import FeatureFuelSection from "@/components/website/FeatureFuelSection";
import FeatureNavigationSection from "@/components/website/FeatureNavigationSection";
import FeatureNotificationsSection from "@/components/website/FeatureNotificationsSection";
import FeatureLogbookSection from "@/components/website/FeatureLogbookSection";
import ProfessionsSection from "@/components/website/ProfessionsSection";
import EcosystemSection from "@/components/website/EcosystemSection";
import AudienceTabsSection from "@/components/website/AudienceTabsSection";
import { DataSovereigntyBadge } from "@/components/shared/DataSovereigntyBadge";
import PillarsSection from "@/components/website/PillarsSection";
import OfflineSection from "@/components/website/OfflineSection";
import DemoSection from "@/components/website/DemoSection";
import PricingV2 from "@/components/website/PricingV2";
import TestimonialsSection from "@/components/website/TestimonialsSection";
import TrustSection from "@/components/website/TrustSection";
import ContactFormSection from "@/components/website/ContactFormSection";
import ChangelogSection from "@/components/website/ChangelogSection";
import HufrenteSection from "@/components/website/HufrenteSection";
import ForWhomSection from "@/components/website/ForWhomSection";
import FounderSection from "@/components/website/FounderSection";
import WhyHufManagerSection from "@/components/website/WhyHufManagerSection";
import FAQ from "@/components/website/FAQ";
import FinalCTA from "@/components/website/FinalCTA";
import FooterNew from "@/components/website/FooterNew";
import LatestBlogPosts from "@/components/website/LatestBlogPosts";
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
      <HeroV2 />
      <ProblemSection />
      <PainSolutionSection />
      <IdentitySection />
      <HorseEcosystem />
      <SolutionSection />
      <FeatureCockpitSection />
      <FeatureFuelSection />
      <FeatureNavigationSection />
      <FeatureLogbookSection />
      <FeatureNotificationsSection />
      <ProfessionsSection />
      <EcosystemSection />
      <AudienceTabsSection />
      <section className="py-16 bg-zinc-950">
        <div className="container max-w-3xl">
          <DataSovereigntyBadge />
        </div>
      </section>
      <PillarsSection />
      <OfflineSection />
      <DemoSection />
      <PricingV2 />
      <TestimonialsSection />
      <ContactFormSection />
      <TrustSection />
      <LatestBlogPosts />
      <ChangelogSection />
      <HufrenteSection />
      <ForWhomSection />
      
      <WhyHufManagerSection />
      <FAQ />
      <FinalCTA />
      <FooterNew />
      <CookieBanner />
    </main>
  );
};

export default WebsiteHome;
