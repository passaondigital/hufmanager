import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ORS_API_KEY = Deno.env.get('ORS_API_KEY');
    if (!ORS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ORS_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { coordinates, optimize, vehicle } = await req.json();

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return new Response(
        JSON.stringify({ error: 'At least 2 coordinates required. Format: [[lng, lat], ...]' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (coordinates.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Maximum 50 coordinates allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If optimize=true, use ORS Optimization API (VROOM) for stop ordering
    if (optimize && coordinates.length >= 3) {
      const jobs = coordinates.slice(1).map((coord: number[], i: number) => ({
        id: i + 1,
        location: coord, // [lng, lat]
      }));

      const optimizeBody: any = {
        jobs,
        vehicles: [{
          id: 1,
          profile: "driving-car",
          start: coordinates[0],
          end: coordinates[0], // return to start
        }],
      };

      // Add vehicle constraints if trailer info provided
      if (vehicle?.trailerHeight) {
        optimizeBody.vehicles[0].profile = "driving-hgv";
      }

      const optResponse = await fetch(
        'https://api.openrouteservice.org/optimization',
        {
          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(optimizeBody),
        }
      );

      if (!optResponse.ok) {
        const errText = await optResponse.text();
        console.error('ORS Optimization error:', optResponse.status, errText);
        // Fall through to regular directions
      } else {
        const optData = await optResponse.json();
        const route = optData.routes?.[0];
        if (route) {
          const optimizedOrder = route.steps
            .filter((s: any) => s.type === 'job')
            .map((s: any) => s.job);

          // Now get full directions with geometry for the optimized order
          const orderedCoords = [coordinates[0]];
          for (const jobId of optimizedOrder) {
            orderedCoords.push(coordinates[jobId]); // jobId is 1-indexed into original slice
          }

          const profile = vehicle?.trailerHeight ? "driving-hgv" : "driving-car";
          const dirResponse = await fetch(
            `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
            {
              method: 'POST',
              headers: {
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                coordinates: orderedCoords,
                instructions: true,
                language: 'de',
              }),
            }
          );

          if (dirResponse.ok) {
            const dirData = await dirResponse.json();
            const feature = dirData.features?.[0];
            if (feature) {
              const segments = feature.properties?.segments || [];
              const steps: any[] = [];
              segments.forEach((seg: any) => {
                (seg.steps || []).forEach((step: any) => {
                  steps.push({
                    instruction: step.instruction,
                    distance: step.distance,
                    duration: step.duration,
                    type: step.type,
                    name: step.name,
                    way_points: step.way_points,
                  });
                });
              });

              return new Response(
                JSON.stringify({
                  distance: feature.properties.summary.distance,
                  duration: feature.properties.summary.duration,
                  geometry: feature.geometry, // GeoJSON LineString
                  steps,
                  optimized_order: optimizedOrder,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
      }
    }

    // Regular directions - use HGV profile if trailer
    const profile = vehicle?.trailerHeight ? "driving-hgv" : "driving-car";
    const dirBody: any = {
      coordinates,
      instructions: true,
      language: 'de',
    };
    if (vehicle?.trailerHeight) {
      dirBody.options = {
        vehicle_type: "hgv",
        ...(vehicle.trailerHeight && { height: vehicle.trailerHeight / 100 }),
        ...(vehicle.trailerWeight && { weight: vehicle.trailerWeight }),
        ...(vehicle.trailerLength && { length: vehicle.trailerLength / 100 }),
      };
    }

    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
      {
        method: 'POST',
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dirBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ORS API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Routing service error', status: response.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) {
      return new Response(
        JSON.stringify({ error: 'No route found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const segments = feature.properties?.segments || [];
    const steps: any[] = [];
    segments.forEach((seg: any) => {
      (seg.steps || []).forEach((step: any) => {
        steps.push({
          instruction: step.instruction,
          distance: step.distance,
          duration: step.duration,
          type: step.type,
          name: step.name,
          way_points: step.way_points,
        });
      });
    });

    return new Response(
      JSON.stringify({
        distance: feature.properties.summary.distance,
        duration: feature.properties.summary.duration,
        geometry: feature.geometry,
        steps,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('get-route error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
