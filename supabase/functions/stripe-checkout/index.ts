import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno&no-check";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PACKAGES = {
  "500":  { name: "Hufi Credits 500",  amount_cents: 500,  credits: 500,  bonus: 0   },
  "1100": { name: "Hufi Credits 1100", amount_cents: 1000, credits: 1000, bonus: 100 },
  "3000": { name: "Hufi Credits 3000", amount_cents: 2500, credits: 2500, bonus: 500 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const siteUrl   = Deno.env.get("SITE_URL") ?? "https://hufiapp.de";

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe nicht konfiguriert" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Nicht autorisiert" }), { status: 401, headers: cors });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "Nicht autorisiert" }), { status: 401, headers: cors });

    const body = await req.json() as { type: string; package?: string; userEmail?: string; userId?: string };
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    let session;

    if (body.type === "credits" && body.package && body.package in PACKAGES) {
      const pkg = PACKAGES[body.package as keyof typeof PACKAGES];
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: body.userEmail,
        metadata: { user_id: user.id, credits: pkg.credits.toString(), bonus: pkg.bonus.toString(), type: "credits" },
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: pkg.name,
              description: `${pkg.credits + pkg.bonus} Hufi KI-Antworten${pkg.bonus > 0 ? ` (inkl. ${pkg.bonus} Bonus)` : ""}`,
            },
            unit_amount: pkg.amount_cents,
          },
          quantity: 1,
        }],
        success_url: `${siteUrl}/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/credits`,
      });
    } else if (body.type === "premium") {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: body.userEmail,
        metadata: { user_id: user.id, type: "premium" },
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: { name: "Hufi Premium", description: "Unlimitierte KI-Antworten" },
            unit_amount: 999,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        success_url: `${siteUrl}/credits?success=true&premium=true`,
        cancel_url: `${siteUrl}/credits`,
      });
    } else {
      return new Response(JSON.stringify({ error: "Ungültiges Paket" }), { status: 400, headers: cors });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[stripe-checkout]", e);
    return new Response(JSON.stringify({ error: "Fehler beim Erstellen der Checkout-Session" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
