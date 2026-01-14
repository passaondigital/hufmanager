import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Copecart product IDs to subscription plans
// HufManager Copecart Products:
// - Anfänger (19€): 9bb65569 → starter
// - Fortgeschritten (29€): ec500b5e → advanced
// - Profi (39€): 483bbb5b → pro
const PRODUCT_PLAN_MAP: Record<string, string> = {
  "9bb65569": "starter",      // Anfänger 19€/Monat
  "ec500b5e": "advanced",     // Fortgeschritten 29€/Monat
  "483bbb5b": "pro",          // Profi 39€/Monat
};

const PRODUCT_PLAN_OVERRIDE_MAP: Record<string, string> = {
  "9bb65569": "copecart_anfaenger",
  "ec500b5e": "copecart_fortgeschritten",
  "483bbb5b": "copecart_profi",
};

function getPlanFromProductId(productId: string): string {
  return PRODUCT_PLAN_MAP[productId] || 'pro';
}

function getPlanOverrideFromProductId(productId: string): string | null {
  return PRODUCT_PLAN_OVERRIDE_MAP[productId] || null;
}

// Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  
  const maxLength = Math.max(aBytes.length, bBytes.length, 1);
  let result = aBytes.length ^ bBytes.length;
  
  for (let i = 0; i < maxLength; i++) {
    const aByte = i < aBytes.length ? aBytes[i] : 0;
    const bByte = i < bBytes.length ? bBytes[i] : 0;
    result |= aByte ^ bByte;
  }
  
  return result === 0;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Copecart webhook received");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the webhook payload
    const payload = await req.json();
    console.log("Webhook payload received:", JSON.stringify(payload, null, 2));

    // Verify IPN password
    const expectedPassword = Deno.env.get("COPECART_IPN_PASSWORD");
    const receivedPassword = payload.password || payload.ipn_password || payload.secret;
    
    if (!expectedPassword) {
      console.error("COPECART_IPN_PASSWORD not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!constantTimeCompare(receivedPassword || '', expectedPassword)) {
      console.error("Invalid IPN password received");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("IPN password verified successfully");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create service role client for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Copecart IPN fields - try multiple possible field names
    const eventType = payload.event || payload.type || payload.event_type;
    const customerEmail = (payload.customer?.email || payload.email || payload.buyer?.email || payload.buyer_email || "").toLowerCase().trim();
    const customerName = payload.customer?.name || payload.buyer?.name || payload.buyer_name || payload.name || "";
    const subscriptionId = payload.subscription_id || payload.id || payload.order_id;
    const productId = payload.product_id || payload.product?.id || "";

    console.log("[copecart] Event:", eventType, "| Product:", productId, "| Email:", customerEmail);

    if (!customerEmail) {
      console.error("No customer email found in payload");
      return new Response(JSON.stringify({ error: "No customer email found" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Find the user by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, subscription_status, subscription_plan")
      .eq("email", customerEmail)
      .maybeSingle();

    if (profileError) {
      console.error("[copecart] Profile lookup failed:", profileError.message);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Determine plan from product
    const subscriptionPlan = getPlanFromProductId(productId);
    const planOverride = getPlanOverrideFromProductId(productId);

    // Handle payment/order events - these are when we should create users
    const isPaymentEvent = [
      "order_created",
      "order.created", 
      "subscription_payment_succeeded",
      "subscription.payment.succeeded",
      "payment_completed",
      "payment.completed",
      "purchase",
      "sale",
    ].includes(eventType);

    // If user doesn't exist and this is a payment event, create the user
    if (!profile && isPaymentEvent) {
      console.log("[copecart] User not found, creating new provider account...");
      
      // Parse name into first and last name
      const nameParts = customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || "Neuer";
      const lastName = nameParts.slice(1).join(" ") || "Provider";
      
      // Create user with invite (sends magic link email)
      const { data: newUser, error: createError } = await supabase.auth.admin.inviteUserByEmail(
        customerEmail,
        {
          data: {
            full_name: customerName || `${firstName} ${lastName}`,
            role: "provider",
          },
          redirectTo: "https://hufmanager.lovable.app/auth",
        }
      );

      if (createError) {
        console.error("[copecart] Error creating user:", createError.message);
        // If user already exists in auth but not in profiles, try to continue
        if (!createError.message.includes("already been registered")) {
          return new Response(JSON.stringify({ error: "Failed to create user" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }

      if (newUser?.user) {
        const userId = newUser.user.id;
        console.log("[copecart] User created:", userId);

        // Wait a moment for the profile to be created by trigger
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update the profile with subscription data
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: customerName || `${firstName} ${lastName}`,
            subscription_status: "active",
            subscription_plan: subscriptionPlan,
            plan_override: planOverride,
            copecart_subscription_id: subscriptionId,
          })
          .eq("id", userId);

        if (updateError) {
          console.error("[copecart] Error updating new profile:", updateError.message);
        }

        // Assign provider role
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({
            user_id: userId,
            role: "provider",
          }, { onConflict: "user_id,role" });

        if (roleError) {
          console.error("[copecart] Error assigning role:", roleError.message);
        }

        // Create default business_settings
        const { error: bsError } = await supabase
          .from("business_settings")
          .upsert({
            user_id: userId,
            business_name: customerName || null,
          }, { onConflict: "user_id" });

        if (bsError) {
          console.error("[copecart] Error creating business settings:", bsError.message);
        }

        console.log("[copecart] New provider account created and configured successfully");
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "New provider account created",
          userId: userId,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // If still no profile found after creation attempt, acknowledge but don't fail
    if (!profile && !isPaymentEvent) {
      console.log("[copecart] No matching user found for non-payment event");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No matching user found, webhook acknowledged" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Existing user - update their subscription
    if (profile) {
      console.log("[copecart] Profile found, updating subscription...");

      let updateData: {
        subscription_status?: string;
        subscription_plan?: string;
        plan_override?: string | null;
        copecart_subscription_id?: string;
      } = {};

      // Handle different event types
      switch (eventType) {
        case "order_created":
        case "order.created":
        case "subscription_payment_succeeded":
        case "subscription.payment.succeeded":
        case "payment_completed":
        case "payment.completed":
        case "purchase":
        case "sale":
          console.log("Processing successful payment/order");
          updateData = {
            subscription_status: "active",
            subscription_plan: subscriptionPlan,
            plan_override: planOverride,
            copecart_subscription_id: subscriptionId,
          };
          break;

        case "subscription_cancelled":
        case "subscription.cancelled":
        case "subscription.canceled":
          console.log("Processing subscription cancellation");
          updateData = {
            subscription_status: "cancelled",
          };
          break;

        case "payment_failed":
        case "payment.failed":
        case "subscription_payment_failed":
        case "subscription.payment.failed":
          console.log("Processing failed payment");
          updateData = {
            subscription_status: "past_due",
          };
          break;

        case "subscription_expired":
        case "subscription.expired":
          console.log("Processing subscription expiration");
          updateData = {
            subscription_status: "cancelled",
            subscription_plan: "starter",
            plan_override: null,
          };
          break;

        case "refund_created":
        case "refund.created":
        case "refund":
          console.log("Processing refund");
          updateData = {
            subscription_status: "cancelled",
            subscription_plan: "starter",
            plan_override: null,
          };
          break;

        default:
          console.log("Unknown event type, logging but not processing:", eventType);
          return new Response(JSON.stringify({ 
            success: true, 
            message: "Event type not handled" 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
      }

      // Update the user's subscription status
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", profile.id);

        if (updateError) {
          console.error("[copecart] Update failed:", updateError.message);
          return new Response(JSON.stringify({ error: "Failed to update subscription" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        console.log("[copecart] Subscription updated successfully");
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[copecart] Error:", error?.message || error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
