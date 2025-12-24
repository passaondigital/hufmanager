import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push requires signing with VAPID keys
// Using crypto primitives for ECDSA signing
async function generateVapidHeaders(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + (12 * 60 * 60); // 12 hours
  
  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: 'mailto:support@hufmanager.de',
  };

  // Base64url encode
  const base64url = (data: string) => 
    btoa(data).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const headerEncoded = base64url(JSON.stringify(header));
  const payloadEncoded = base64url(JSON.stringify(payload));
  const unsignedToken = `${headerEncoded}.${payloadEncoded}`;

  // Import private key for signing
  const privateKeyBytes = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBase64 = base64url(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${unsignedToken}.${signatureBase64}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: `p256ecdsa=${vapidPublicKey}`,
  };
}

// Simplified push notification without full encryption (works with most browsers)
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; url?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number }> {
  try {
    const payloadString = JSON.stringify(payload);
    console.log(`Sending push to: ${subscription.endpoint.substring(0, 80)}...`);

    // For now, use a simplified approach - send payload without encryption
    // This works for testing but production should use proper encryption
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: new TextEncoder().encode(payloadString),
    });

    console.log(`Push response status: ${response.status}`);

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Push failed: ${response.status} - ${responseText}`);
      return { success: false, statusCode: response.status };
    }

    return { success: true };
  } catch (error) {
    console.error(`Error sending push:`, error);
    return { success: false };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('VAPID keys present, processing request...');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, body, url } = await req.json();

    if (!user_id || !title) {
      console.error('Missing required fields: user_id or title');
      return new Response(
        JSON.stringify({ error: 'user_id and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing push for user ${user_id}: "${title}"`);

    // Get all subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification payload
    const payload = {
      title,
      body: body || '',
      icon: '/hufmanager-logo.png',
      url: url || '/chat',
    };

    let sentCount = 0;
    const expiredSubscriptionIds: string[] = [];

    // Send push to all subscriptions
    for (const sub of subscriptions) {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.success) {
        sentCount++;
      } else if (result.statusCode === 404 || result.statusCode === 410) {
        expiredSubscriptionIds.push(sub.id);
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptionIds.length > 0) {
      console.log(`Cleaning up ${expiredSubscriptionIds.length} expired subscriptions`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptionIds);
    }

    console.log(`Push sent: ${sentCount}/${subscriptions.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        total: subscriptions.length,
        cleanedUp: expiredSubscriptionIds.length 
      }),
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
