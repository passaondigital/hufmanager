import { useEffect } from "react";
import Navbar from "@/components/website/Navbar";
import { useGA4 } from "@/hooks/useGA4";
import HeroV2 from "@/components/website/HeroV2";
import ProblemSection from "@/components/website/ProblemSection";
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
import TrustSection from "@/components/website/TrustSection";
import ContactFormSection from "@/components/website/ContactFormSection";
import ChangelogSection from "@/components/website/ChangelogSection";
import HufrenteSection from "@/components/website/HufrenteSection";
import ForWhomSection from "@/components/website/ForWhomSection";
import FAQ from "@/components/website/FAQ";
import FinalCTA from "@/components/website/FinalCTA";
import FooterNew from "@/components/website/FooterNew";
import LatestBlogPosts from "@/components/website/LatestBlogPosts";
import CookieBanner from "@/components/website/CookieBanner";

const WebsiteHome = () => {
  useGA4();

  useEffect(() => {
    document.title = "HufManager – App für Hufbearbeiter, Osteopathen & mobile Pferdeprofis";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "HufManager ist die digitale Lösung für alle mobilen Pferdeprofis. Tages-Cockpit, Turn-by-Turn Navigation, Live-Spritpreise, automatisches Fahrtenbuch und Kundenbenachrichtigung in Echtzeit.");
    }
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.setAttribute("name", "keywords");
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute("content", "Hufbearbeiter App, Pferdeosteopath App, Pferdephysiotherapeut Software, Equine Dentist Tool, mobile Pferdeprofis, digitales Fahrtenbuch Pferd, Terminplanung Pferdeprofis, Hufpflege Software, Tourenplanung Pferde, Reitlehrer Software, Sattler App");
  }, []);

  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      <HeroV2 />
      <ProblemSection />
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
      <ContactFormSection />
      <TrustSection />
      <LatestBlogPosts />
      <ChangelogSection />
      <HufrenteSection />
      <ForWhomSection />
      <FAQ />
      <FinalCTA />
      <FooterNew />
      <CookieBanner />
    </main>
  );
};

export default WebsiteHome;
