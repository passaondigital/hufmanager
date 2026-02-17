import { LandingContactForm } from "@/components/landing/LandingContactForm";

interface LandingContactProps {
  providerId: string;
  providerName: string;
  primaryColor: string;
}

export const LandingContact = ({ providerId, providerName, primaryColor }: LandingContactProps) => (
  <section id="kontakt" className="py-16 px-4 bg-muted/30">
    <div className="max-w-5xl mx-auto">
      <LandingContactForm
        providerId={providerId}
        providerName={providerName}
        primaryColor={primaryColor}
      />
    </div>
  </section>
);
