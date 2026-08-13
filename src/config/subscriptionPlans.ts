export type SubscriptionPlanId = "hufmanager_slim" | "hufiapp_premium";

export interface SubscriptionPlanMarketingText {
  productUrl: string;
  copecartProductId?: string;
  checkoutUrl?: string;
  supportEmail: string;
  productName: string;
  tariffName: string;
  description: string;
  included: string[];
  notIncluded: string[];
  billing: string;
  delivery: string;
  firstPaymentLabel: string;
  nextPaymentLabel: string;
  invoiceLabel: string;
  returnPolicyLabel: string;
  returnPolicyOptions: string[];
}

export const HUFMANAGER_SLIM_TEXT: SubscriptionPlanMarketingText = {
  productUrl: "https://hufmanager.de",
  copecartProductId: "3a97bd25",
  checkoutUrl: "https://copecart.com/products/3a97bd25/checkout",
  supportEmail: "teamhufmanager@gmail.com",
  productName: "HufManager Slim",
  tariffName: "Ein Tarif",
  description:
    'Nutzungslizenz für die Software "HufManager Slim" (SaaS) - ein Tarif zum Launch',
  included: [
    "Tagescockpit, Tourenplaner und Routing inklusive",
    "Kunden, Pferdeakte, Termine und Bearbeitungsverlauf",
    "Hufi Hufanalyse im HufManager-Kontext",
    "Follow-ups, Erinnerungen und mobiler Arbeitsalltag",
    "Schlanke professionelle Rechnungen und Zahlungsstatus",
    "Kostenloser Kundenzugang für Pferdebesitzer mit Relationship-Scope",
  ],
  notIncluded: [
    "HufiApp Premium",
    "automatische Zahlung nach Trial",
    "Team-/Enterprise-Staffelung",
    "Marketing-Automation",
  ],
  billing:
    "14 Tage kostenloser In-App-Test ohne Kreditkarte. Danach startet ein kostenpflichtiges Abo nur durch aktiven Checkout. Monatliche Abrechnung, monatlich kündbar.",
  delivery:
    "Der In-App-Test startet direkt nach Registrierung. Nach aktivem Checkout wird der Zugang digital freigeschaltet. Es erfolgt kein physischer Versand.",
  firstPaymentLabel: "Erste Zahlung",
  nextPaymentLabel: "Nächste Zahlung",
  invoiceLabel: "Rechnung",
  returnPolicyLabel: "Rückgabe Regelung",
  returnPolicyOptions: ["Keine Rückgabe möglich", "14 Tage", "30 Tage", "60 Tage"],
};

export const HUFIAPP_PREMIUM_TEXT: SubscriptionPlanMarketingText = {
  productUrl: "https://hufiapp.de",
  supportEmail: "teamhufmanager@gmail.com",
  productName: "HufiApp",
  tariffName: "Premium",
  description:
    'Nutzungslizenz für die Software "HufiApp" (SaaS) - Premium-Produkt',
  included: [
    "Premium-Funktionsumfang der HufiApp",
    "Kostenloser Pferdebesitzer-Zugang mit Relationship-Scope",
  ],
  notIncluded: [
    "kostenloser Testzeitraum",
    "automatische HufManager-Slim-Freischaltung",
  ],
  billing:
    "Kein kostenloser Testzeitraum. Kostenpflichtiger Einstieg ausschließlich nach aktivem Checkout.",
  delivery:
    "Nach aktivem Checkout wird der Zugang digital freigeschaltet. Es erfolgt kein physischer Versand.",
  firstPaymentLabel: "Erste Zahlung",
  nextPaymentLabel: "Nächste Zahlung",
  invoiceLabel: "Rechnung",
  returnPolicyLabel: "Rückgabe Regelung",
  returnPolicyOptions: ["Keine Rückgabe möglich", "14 Tage", "30 Tage", "60 Tage"],
};

export const HUFMANAGER_STARTER_TEXT = HUFMANAGER_SLIM_TEXT;
