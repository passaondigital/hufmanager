import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Copecart product IDs to subscription plans
// These should be configured based on your actual Copecart products
const PRODUCT_PLAN_MAP: Record<string, string> = {
  // Add your Copecart product IDs here
  // "product_id_starter": "starter",
  // "product_id_pro": "pro",
  // Default mapping - any product defaults to 'pro' if not mapped
};

function getPlanFromProductId(productId: string): string {
  return PRODUCT_PLAN_MAP[productId] || 'pro';
}

// Constant-time string comparison to prevent timing attacks
// Uses TextEncoder for consistent byte comparison and fixed iteration count
function constantTimeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  
  // Use the longer length to ensure consistent timing regardless of input lengths
  const maxLength = Math.max(aBytes.length, bBytes.length, 1);
  
  let result = aBytes.length ^ bBytes.length; // Non-zero if lengths differ
  
  for (let i = 0; i < maxLength; i++) {
    // Use 0 as fallback for shorter string to maintain constant iterations
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
    console.log("Webhook payload received");

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Copecart IPN fields (adjust based on actual Copecart IPN structure)
    const eventType = payload.event || payload.type;
    const customerEmail = payload.customer?.email || payload.email || payload.buyer?.email;
    const subscriptionId = payload.subscription_id || payload.id;
    const productId = payload.product_id || payload.product?.id;

    console.log("[copecart] Event:", eventType, "| Product:", productId);

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
      .eq("email", customerEmail.toLowerCase())
      .maybeSingle();

    if (profileError) {
      console.error("[copecart] Profile lookup failed");
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!profile) {
      console.log("[copecart] No matching user found");
      // User hasn't registered yet - store this for later processing
      // Or the email doesn't match - log and return success to acknowledge receipt
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No matching user found, webhook acknowledged" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("[copecart] Profile found");

    let updateData: {
      subscription_status?: string;
      subscription_plan?: string;
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
        console.log("Processing successful payment/order");
        updateData = {
          subscription_status: "active",
          subscription_plan: getPlanFromProductId(productId),
          copecart_subscription_id: subscriptionId,
        };
        break;

      case "subscription_cancelled":
      case "subscription.cancelled":
      case "subscription.canceled":
        console.log("Processing subscription cancellation");
        updateData = {
          subscription_status: "cancelled",
          // Keep the plan until end of period
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
        };
        break;

      case "refund_created":
      case "refund.created":
        console.log("Processing refund");
        updateData = {
          subscription_status: "cancelled",
          subscription_plan: "starter",
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
        console.error("[copecart] Update failed");
        return new Response(JSON.stringify({ error: "Failed to update subscription" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.log("[copecart] Subscription updated successfully");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[copecart] Error:", error instanceof Error ? error.name : "Unknown");
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
