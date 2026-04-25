import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno&no-check";

serve(async (req) => {
  const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret   = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
  const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const sig  = req.headers.get("stripe-signature");
  const body = await req.text();

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const supabase = createClient(supabaseUrl, supabaseService);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature validation failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log("[stripe-webhook] Event:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.metadata?.user_id;
    const type    = session.metadata?.type;

    if (!userId) {
      console.error("[stripe-webhook] No user_id in metadata");
      return new Response("OK", { status: 200 });
    }

    if (type === "credits") {
      const credits = parseInt(session.metadata?.credits ?? "0");
      const bonus   = parseInt(session.metadata?.bonus ?? "0");
      const total   = credits + bonus;
      const desc    = `Credits-Kauf${bonus > 0 ? ` (+${bonus} Bonus)` : ""}`;

      const { error } = await supabase.rpc("add_hufi_credits", {
        p_user_id: userId,
        p_amount: total,
        p_description: desc,
        p_stripe_id: session.payment_intent as string ?? session.id,
      });

      if (error) console.error("[stripe-webhook] add_hufi_credits error:", error.message);
      else console.log(`[stripe-webhook] Added ${total} credits to user ${userId}`);

    } else if (type === "premium") {
      // Premium subscription started — give 10000 "unlimited" marker credits
      await supabase.rpc("add_hufi_credits", {
        p_user_id: userId,
        p_amount: 10000,
        p_description: "Premium-Abo aktiviert",
        p_stripe_id: session.id,
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    // Could handle subscription cancellation here
    console.log("[stripe-webhook] Subscription deleted:", event.data.object);
  }

  return new Response("OK", { status: 200 });
});
