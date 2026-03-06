import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NominatimResult {
  lat: string;
  lon: string;
}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "de,at,ch");

  const res = await fetch(url.toString(), {
    headers: {
      "Accept-Language": "de",
      "User-Agent": "HufManager/1.0",
    },
  });

  if (!res.ok) return null;
  const data: NominatimResult[] = await res.json();
  if (!data?.length) return null;

  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  return isNaN(lat) || isNaN(lng) ? null : { lat, lng };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: require service_role or valid JWT
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  // Reject anon key
  if (authHeader === `Bearer ${anonKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Get provider_id from body or JWT
  let providerId: string | null = null;
  try {
    const body = await req.json();
    providerId = body?.provider_id || null;
  } catch {
    // no body
  }

  if (!providerId) {
    // Try from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    providerId = user?.id || null;
  }

  if (!providerId) {
    return new Response(JSON.stringify({ error: "provider_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch appointments missing coordinates
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id, location, horse_id, client_id,
      horses(id, location_name, latitude, longitude)
    `)
    .eq("provider_id", providerId)
    .or("location_geocoded.is.null,location_geocoded.eq.false")
    .is("appointment_lat", null)
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let geocoded = 0;
  let failed = 0;
  const total = appointments?.length || 0;

  for (const apt of appointments || []) {
    // Rate limit: 1 req/sec
    await new Promise((r) => setTimeout(r, 1100));

    let result: { lat: number; lng: number } | null = null;

    // Priority 1: client_locations
    if (apt.client_id) {
      const { data: locs } = await supabase
        .from("client_locations")
        .select("lat, lng, address, city, zip_code")
        .eq("client_id", apt.client_id)
        .eq("is_default", true)
        .limit(1);

      const loc = locs?.[0];
      if (loc?.lat && loc?.lng) {
        result = { lat: loc.lat, lng: loc.lng };
      } else if (loc) {
        const q = [loc.address, loc.zip_code, loc.city].filter(Boolean).join(", ");
        if (q) result = await geocode(q);
      }
    }

    // Priority 2: location field
    if (!result && apt.location) {
      result = await geocode(apt.location);
    }

    // Priority 3: horse
    const horse = (apt as any).horses;
    if (!result && horse) {
      if (horse.latitude && horse.longitude) {
        result = { lat: horse.latitude, lng: horse.longitude };
      } else if (horse.location_name) {
        result = await geocode(horse.location_name);
      }
    }

    // Priority 4: contact address
    if (!result && apt.client_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("street, zip_code, city")
        .eq("profile_id", apt.client_id)
        .limit(1)
        .maybeSingle();

      if (contact) {
        const q = [contact.street, contact.zip_code, contact.city].filter(Boolean).join(", ");
        if (q) result = await geocode(q);
      }
    }

    if (result) {
      await supabase
        .from("appointments")
        .update({
          appointment_lat: result.lat,
          appointment_lng: result.lng,
          location_geocoded: true,
        })
        .eq("id", apt.id);

      if (apt.horse_id) {
        await supabase
          .from("horses")
          .update({ latitude: result.lat, longitude: result.lng })
          .eq("id", apt.horse_id);
      }
      geocoded++;
    } else {
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ total, geocoded, failed }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
