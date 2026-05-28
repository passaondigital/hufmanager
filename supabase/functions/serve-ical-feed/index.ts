import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate iCal date format (YYYYMMDDTHHMMSS)
function formatICalDate(date: string, time: string | null): string {
  const d = new Date(date);
  if (time) {
    const [hours, minutes] = time.split(":");
    d.setHours(parseInt(hours), parseInt(minutes), 0);
  }
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Escape special characters for iCal
function escapeICalText(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      console.error("Missing token parameter");
      return new Response("Missing token", { status: 400 });
    }

    // Create Supabase client with service role for unrestricted access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by ical_token
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("ical_token", token)
      .single();

    if (profileError || !profile) {
      console.error("Invalid token or profile not found:", profileError);
      return new Response("Invalid token", { status: 401 });
    }

    console.log(`Generating iCal feed for user: ${profile.id}`);

    // Fetch appointments for this provider
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        time,
        duration,
        service_type,
        notes,
        location,
        status,
        horses:horse_id(name, breed)
      `)
      .eq("provider_id", profile.id)
      .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]) // Last 30 days
      .order("date", { ascending: true });

    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError);
      throw appointmentsError;
    }

    console.log(`Found ${appointments?.length || 0} appointments`);

    // Generate iCal content
    const calendarName = `HufManager - ${profile.full_name || "Termine"}`;
    let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HufManager//Kalender//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeICalText(calendarName)}
X-WR-TIMEZONE:Europe/Berlin
`;

    for (const apt of appointments || []) {
      const startDate = formatICalDate(apt.date, apt.time);
      const duration = apt.duration || 60;
      
      // Calculate end time
      const startDateTime = new Date(apt.date);
      if (apt.time) {
        const [hours, minutes] = apt.time.split(":");
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
      }
      const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
      const endDate = endDateTime.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

      // Handle horses - supabase returns array for joins, take first element
      const horseArray = apt.horses as unknown as Array<{ name: string; breed: string | null }> | null;
      const horseData = horseArray && horseArray.length > 0 ? horseArray[0] : null;
      const horseName = horseData?.name || "Unbekannt";
      const summary = `🐴 ${horseName} - ${apt.service_type || "Termin"}`;
      const description = [
        apt.notes ? `Notizen: ${apt.notes}` : "",
        apt.status ? `Status: ${apt.status}` : "",
        horseData?.breed ? `Rasse: ${horseData.breed}` : "",
      ].filter(Boolean).join("\\n");

      icalContent += `BEGIN:VEVENT
UID:${apt.id}@hufmanager.de
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${escapeICalText(summary)}
DESCRIPTION:${escapeICalText(description)}
LOCATION:${escapeICalText(apt.location)}
STATUS:${apt.status === "completed" ? "COMPLETED" : apt.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}
END:VEVENT
`;
    }

    icalContent += "END:VCALENDAR";

    console.log("iCal feed generated successfully");

    return new Response(icalContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="hufmanager-termine.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: unknown) {
    console.error("Error generating iCal feed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
