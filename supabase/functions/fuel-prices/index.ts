const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TANKERKOENIG_API_KEY');
    console.log('API key present:', !!apiKey, 'length:', apiKey?.length);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Tankerkönig API-Key nicht konfiguriert' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lat, lng, rad = 5, type = 'all' } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'lat und lng sind erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radius = Math.min(Math.max(parseFloat(rad), 1), 25);

    if (isNaN(latitude) || isNaN(longitude) || latitude < 47 || latitude > 55 || longitude < 5 || longitude > 16) {
      return new Response(
        JSON.stringify({ error: 'Koordinaten außerhalb Deutschlands' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validTypes = ['all', 'e5', 'e10', 'diesel'];
    const fuelType = validTypes.includes(type) ? type : 'all';

    const sortParam = fuelType === 'all' ? 'dist' : 'price';
    const url = `https://creativecommons.tankerkoenig.de/json/list.php?lat=${latitude}&lng=${longitude}&rad=${radius}&sort=${sortParam}&type=${fuelType}&apikey=${apiKey}`;

    console.log('Fetching URL:', url.replace(apiKey!, '***'));
    const response = await fetch(url);
    const data = await response.json();
    console.log('API response ok:', data.ok, 'stations:', data.stations?.length, 'message:', data.message);

    if (!data.ok) {
      return new Response(
        JSON.stringify({ error: data.message || 'Tankerkönig API Fehler' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return only relevant fields (no API key leakage)
    const stations = (data.stations || []).slice(0, 10).map((s: any) => ({
      id: s.id,
      name: s.name,
      brand: s.brand,
      street: s.street,
      place: s.place,
      lat: s.lat,
      lng: s.lng,
      dist: s.dist,
      diesel: s.diesel,
      e5: s.e5,
      e10: s.e10,
      isOpen: s.isOpen,
    }));

    return new Response(
      JSON.stringify({ ok: true, stations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Interner Fehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
