import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to ensure proper ArrayBuffer type
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(data.length);
  new Uint8Array(buf).set(data);
  return buf;
}

// Base64url encoding/decoding utilities
function base64urlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4;
  const padded = pad ? str + '='.repeat(4 - pad) : str;
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

// HKDF implementation for key derivation (RFC 5869)
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  // Extract
  const saltBuffer = salt.length > 0 ? toArrayBuffer(salt) : new ArrayBuffer(32);
  const key = await crypto.subtle.importKey(
    'raw',
    saltBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, toArrayBuffer(ikm)));

  // Expand
  const hashLen = 32;
  const steps = Math.ceil(length / hashLen);
  const result = new Uint8Array(steps * hashLen);

  const prkKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(prk),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  let prev = new Uint8Array(0);
  for (let i = 0; i < steps; i++) {
    const input = new Uint8Array(prev.length + info.length + 1);
    input.set(prev, 0);
    input.set(info, prev.length);
    input[prev.length + info.length] = i + 1;

    prev = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, toArrayBuffer(input)));
    result.set(prev, i * hashLen);
  }

  return result.slice(0, length);
}

// Create info for HKDF
function createInfo(type: string, context: Uint8Array): Uint8Array {
  const prefix = new TextEncoder().encode('Content-Encoding: ' + type + '\0');
  const info = new Uint8Array(prefix.length + context.length);
  info.set(prefix, 0);
  info.set(context, prefix.length);
  return info;
}

// RFC 8291 Web Push Encryption
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const clientPublicKeyBytes = base64urlDecode(p256dhKey);
  const authSecretBytes = base64urlDecode(authSecret);

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(clientPublicKeyBytes),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Create key info context
  const keyLabel = new TextEncoder().encode('P-256');
  const context = new Uint8Array(5 + 2 + 65 + 2 + 65);
  context.set(keyLabel, 0);
  context[5] = 0;
  context[6] = 0;
  context[7] = 65;
  context.set(clientPublicKeyBytes, 8);
  context[73] = 0;
  context[74] = 65;
  context.set(localPublicKeyRaw, 75);

  // Derive PRK from auth secret and shared secret
  const prkInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const prk = await hkdf(authSecretBytes, sharedSecret, prkInfo, 32);

  // Derive content encryption key
  const cekInfo = createInfo('aes128gcm', context);
  const cek = await hkdf(salt, prk, cekInfo, 16);

  // Derive nonce
  const nonceInfo = createInfo('nonce', context);
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  // Pad the payload
  const payloadBytes = new TextEncoder().encode(payload);
  const padded = new Uint8Array(payloadBytes.length + 1);
  padded.set(payloadBytes, 0);
  padded[payloadBytes.length] = 2;

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(cek),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Encrypt with AES-128-GCM
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(nonce), tagLength: 128 },
      aesKey,
      toArrayBuffer(padded)
    )
  );

  return { encrypted: ciphertext, salt, localPublicKey: localPublicKeyRaw };
}

// Build the aes128gcm encrypted body according to RFC 8188
function buildEncryptedBody(
  encrypted: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array
): Uint8Array {
  const recordSize = 4096;
  const header = new Uint8Array(86);
  header.set(salt, 0);
  const rs = new DataView(header.buffer, 16, 4);
  rs.setUint32(0, recordSize, false);
  header[20] = 65;
  header.set(localPublicKey, 21);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header, 0);
  body.set(encrypted, header.length);

  return body;
}

// Generate VAPID JWT token
async function generateVapidToken(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + (12 * 60 * 60);

  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: 'mailto:support@hufmanager.de',
  };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const publicKeyBytes = base64urlDecode(vapidPublicKey);

  // Extract x and y from uncompressed public key (65 bytes: 0x04 || x || y)
  if (publicKeyBytes[0] === 0x04 && publicKeyBytes.length === 65) {
    const x = base64urlEncode(publicKeyBytes.slice(1, 33));
    const y = base64urlEncode(publicKeyBytes.slice(33, 65));

    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      x,
      y,
      d: vapidPrivateKey,
    };

    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(unsignedToken)
    );

    const sigArray = new Uint8Array(signatureBuffer);
    const signatureB64 = base64urlEncode(sigArray);
    return `${unsignedToken}.${signatureB64}`;
  }

  throw new Error('Invalid VAPID public key format');
}

// Send encrypted push notification
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; url?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number }> {
  try {
    const sanitizedPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/hufmanager-logo.png',
      url: payload.url || '/chat',
    };

    const payloadString = JSON.stringify(sanitizedPayload);
    console.log(`Sending encrypted push to: ${subscription.endpoint.substring(0, 60)}...`);

    // Encrypt the payload using RFC 8291
    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payloadString,
      subscription.p256dh,
      subscription.auth
    );

    // Build the encrypted body
    const body = buildEncryptedBody(encrypted, salt, localPublicKey);

    // Generate VAPID authorization
    const vapidToken = await generateVapidToken(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey
    );

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': body.length.toString(),
        'TTL': '86400',
        'Urgency': 'high',
        'Authorization': `vapid t=${vapidToken}, k=${vapidPublicKey}`,
      },
      body: toArrayBuffer(body),
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    // --- Authentication check ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === supabaseServiceKey;

    if (!isServiceRole) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await authClient.auth.getUser(token);
      if (userError || !userData?.user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // --- End authentication check ---

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

    const notificationPayload = {
      title,
      body: body || '',
      icon: '/hufmanager-logo.png',
      url: url || '/chat',
    };

    let sentCount = 0;
    const expiredSubscriptionIds: string[] = [];

    for (const sub of subscriptions) {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        notificationPayload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.success) {
        sentCount++;
      } else if (result.statusCode === 404 || result.statusCode === 410) {
        expiredSubscriptionIds.push(sub.id);
      }
    }

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
