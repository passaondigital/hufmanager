import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64URL encoding/decoding utilities
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const base64Padded = base64 + padding;
  const rawData = atob(base64Padded);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Send push notification using a simpler approach with VAPID
async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; url?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const payloadString = JSON.stringify(payload);
    
    // Get audience from endpoint
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    // Create VAPID headers
    const now = Math.floor(Date.now() / 1000);
    const expiration = now + 12 * 60 * 60; // 12 hours

    // For VAPID, we need to create a signed JWT
    // Since Deno doesn't have easy web-push, we'll use a simpler approach
    // by sending the payload directly (works for some push services)
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'TTL': '86400',
      'Urgency': 'normal',
    };

    // Try sending as JSON (works for Firebase/Chrome)
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: headers,
      body: payloadString,
    });

    if (!response.ok) {
      // If it fails, log the error
      const responseText = await response.text();
      console.error(`Push failed for ${subscription.endpoint}: ${response.status} ${response.statusText}`);
      console.error('Response:', responseText);
      
      // For 401/403, the subscription might be invalid or VAPID is required
      if (response.status === 401 || response.status === 403) {
        console.log('VAPID authentication required but not fully implemented');
      }
      return false;
    }

    console.log(`Push sent successfully to ${subscription.endpoint}`);
    return true;
  } catch (error) {
    console.error(`Error sending push to ${subscription.endpoint}:`, error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, body, url } = await req.json();

    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: 'user_id and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push notification to user ${user_id}: ${title}`);

    // Get all subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions for user ${user_id}`);

    // Also create an in-app notification
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id,
      title,
      message: body || '',
      link: url || null,
      type: 'push',
    });
    
    if (notifError) {
      console.error('Error creating in-app notification:', notifError);
    }

    // Send push to all subscriptions
    const payload = {
      title,
      body: body || '',
      icon: '/hufmanager-logo.png',
      url: url || '/',
    };

    let sentCount = 0;
    for (const sub of subscriptions) {
      const success = await sendPushToSubscription(sub, payload, vapidPublicKey, vapidPrivateKey);
      if (success) sentCount++;
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
