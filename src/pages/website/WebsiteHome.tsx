import { useEffect } from "react";
import Navbar from "@/components/website/Navbar";
import PricingV2 from "@/components/website/PricingV2";
import TestimonialsSection from "@/components/website/TestimonialsSection";
import FooterNew from "@/components/website/FooterNew";
import CookieBanner from "@/components/website/CookieBanner";
import { useGA4 } from "@/hooks/useGA4";

import HeroSection from "@/components/website/sections/HeroSection";
import ProblemSection from "@/components/website/sections/ProblemSection";
import TodaySection from "@/components/website/sections/TodaySection";
import LearningSection from "@/components/website/sections/LearningSection";
import VisionSection from "@/components/website/sections/VisionSection";
import RolesSection from "@/components/website/sections/RolesSection";
import HowItWorksSection from "@/components/website/sections/HowItWorksSection";
import TrustDataSection from "@/components/website/sections/TrustDataSection";
import FounderSectionNew from "@/components/website/sections/FounderSectionNew";
import FinalCtaSection from "@/components/website/sections/FinalCtaSection";

import "@/styles/hufi-landing.css";

const WebsiteHome = () => {
  useGA4();

  useEffect(() => {
    document.title = "Hufi — Der Assistent für Hufbearbeiter und die Pferdewelt";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Hufi ist der digitale Assistent für Hufbearbeiter, Hufschmiede, Reitlehrer, Stallbetreiber & Pferdebesitzer. Sprachsteuerung, Pferdeakte, Rechnungen — heute nutzbar. 14 Tage kostenlos testen."
      );
    }
    const existingLd = document.querySelector('script[data-huf-schema]');
    if (!existingLd) {
      const ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.setAttribute("data-huf-schema", "true");
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Hufi",
        description:
          "Digitaler Assistent für Hufbearbeiter, Hufschmiede, Reitlehrer, Stallbetreiber & Pferdebesitzer. Sprachsteuerung, Pferdeakte, Rechnungen in einer App.",
        url: "https://hufiapp.de",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        offers: { "@type": "Offer", price: "9.95", priceCurrency: "EUR" },
        author: { "@type": "Person", name: "Pascal Schmid" },
      });
      document.head.appendChild(ld);
    }
    return () => { document.querySelector('script[data-huf-schema]')?.remove(); };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <TodaySection />
      <LearningSection />
      <VisionSection />
      <RolesSection />
      <HowItWorksSection />
      <TrustDataSection />
      <FounderSectionNew />
      <PricingV2 />
      <TestimonialsSection />
      <FinalCtaSection />
      <FooterNew />
      <CookieBanner />
    </div>
  );
};

export default WebsiteHome;
