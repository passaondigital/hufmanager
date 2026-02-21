import { useEffect } from "react";
import Navbar from "@/components/website/Navbar";
import HeroV2 from "@/components/website/HeroV2";
import ProblemSection from "@/components/website/ProblemSection";
import IdentitySection from "@/components/website/IdentitySection";
import HorseEcosystem from "@/components/website/HorseEcosystem";
import SolutionSection from "@/components/website/SolutionSection";
import EcosystemSection from "@/components/website/EcosystemSection";
import PillarsSection from "@/components/website/PillarsSection";
import OfflineSection from "@/components/website/OfflineSection";
import DemoSection from "@/components/website/DemoSection";
import PricingV2 from "@/components/website/PricingV2";
import TrustSection from "@/components/website/TrustSection";
import ContactFormSection from "@/components/website/ContactFormSection";
import HufrenteSection from "@/components/website/HufrenteSection";
import FAQ from "@/components/website/FAQ";
import FinalCTA from "@/components/website/FinalCTA";
import FooterNew from "@/components/website/FooterNew";
import LatestBlogPosts from "@/components/website/LatestBlogPosts";
import CookieBanner from "@/components/website/CookieBanner";

const WebsiteHome = () => {
  useEffect(() => {
    // Set SEO meta tags
    document.title = "HufManager - Die All-in-One Plattform für Pferde-Profis";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Terminplanung, Dokumentation, Rechnungen & Vernetzung für Hufbearbeiter, Therapeuten, Trainer & alle Pferde-Profis. 100% DSGVO-konform. Jetzt kostenlos starten!");
    }
  }, []);

  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      <HeroV2 />
      <ProblemSection />
      <IdentitySection />
      <HorseEcosystem />
      <SolutionSection />
      <EcosystemSection />
      <PillarsSection />
      <OfflineSection />
      <DemoSection />
      <PricingV2 />
      <ContactFormSection />
      <TrustSection />
      <LatestBlogPosts />
      <HufrenteSection />
      <FAQ />
      <FinalCTA />
      <FooterNew />
      <CookieBanner />
    </main>
  );
};

export default WebsiteHome;
