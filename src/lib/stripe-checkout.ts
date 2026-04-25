import { supabase } from "@/integrations/supabase/client";

export type CreditPackage = "500" | "1100" | "3000";

export const CREDIT_PACKAGES = {
  "500":  { credits: 500,  bonus: 0,   priceEur: 5.00,  label: "Starter",    popular: false },
  "1100": { credits: 1000, bonus: 100, priceEur: 10.00, label: "Popular",    popular: true  },
  "3000": { credits: 2500, bonus: 500, priceEur: 25.00, label: "Best Value", popular: false },
} as const;

export async function createCreditCheckout(
  userId: string,
  userEmail: string,
  pkg: CreditPackage,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: { userId, userEmail, package: pkg, type: "credits" },
  });
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error("Keine Checkout-URL erhalten");
  return data.url as string;
}

export async function createPremiumSubscription(
  userId: string,
  userEmail: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: { userId, userEmail, type: "premium" },
  });
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error("Keine Checkout-URL erhalten");
  return data.url as string;
}
