import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send push notification using the web-push library approach with fetch
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; url?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const payloadString = JSON.stringify(payload);

    console.log(`Sending push to endpoint: ${subscription.endpoint}`);
    console.log(`Payload: ${payloadString}`);

    // For now, use a simple POST request
    // In production, you'd want to use proper VAPID signing
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: payloadString,
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Push failed: ${response.status} ${response.statusText}`);
      console.error('Response:', responseText);
      
      // If subscription is invalid, we should clean it up
      if (response.status === 404 || response.status === 410) {
        console.log('Subscription no longer valid, should be cleaned up');
      }
      return false;
    }

    console.log(`Push sent successfully`);
    return true;
  } catch (error) {
    console.error(`Error sending push:`, error);
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

    console.log('VAPID Public Key present:', !!vapidPublicKey);
    console.log('VAPID Private Key present:', !!vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, body, url } = await req.json();

    if (!user_id || !title) {
      console.error('Missing required fields: user_id or title');
      return new Response(
        JSON.stringify({ error: 'user_id and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing push notification for user ${user_id}: "${title}"`);

    // Get all subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions for user ${user_id}`);

    // Create an in-app notification regardless of push subscriptions
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id,
      title,
      message: body || '',
      link: url || null,
      type: 'push',
    });
    
    if (notifError) {
      console.error('Error creating in-app notification:', notifError);
    } else {
      console.log('In-app notification created successfully');
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found, in-app notification created' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send push to all subscriptions
    const payload = {
      title,
      body: body || '',
      icon: '/hufmanager-logo.png',
      url: url || '/',
    };

    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      console.log(`Attempting to send push to subscription: ${sub.endpoint.substring(0, 50)}...`);
      const success = await sendPushNotification(sub, payload, vapidPublicKey, vapidPrivateKey);
      if (success) {
        sentCount++;
      } else {
        failedEndpoints.push(sub.endpoint);
      }
    }

    console.log(`Push notifications sent: ${sentCount}/${subscriptions.length}`);

    // Clean up invalid subscriptions
    if (failedEndpoints.length > 0) {
      console.log(`Cleaning up ${failedEndpoints.length} failed subscriptions`);
      for (const endpoint of failedEndpoints) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        total: subscriptions.length,
        cleanedUp: failedEndpoints.length 
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
