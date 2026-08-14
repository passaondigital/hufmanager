import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sanitizeText(input?: string): string | undefined {
  if (!input) return undefined;
  const stripped = input.replace(/<[^>]*>?/gm, "").trim();
  if (!stripped) return undefined;
  return stripped.slice(0, 200);
}

function calculateNewArrival(scheduledTime: string | null, delayMinutes: number): string | null {
  if (!scheduledTime) return null;
  const parts = scheduledTime.split(":");
  if (parts.length < 2) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return null;

  const totalMinutes = hours * 60 + minutes + delayMinutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;

  const hh = newHours.toString().padStart(2, "0");
  const mm = newMinutes.toString().padStart(2, "0");

  return `${hh}:${mm}`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // A. Require a valid authenticated JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unaufgefordertes oder fehlendes Auth-Token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Ungültige Sitzung" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderId = userData.user.id;

    // Read payload parameters (frontend provides ONLY appointment_id, delay_minutes, note, action_type)
    const body = await req.json();
    const { appointment_id, delay_minutes, note, action_type = "delay" } = body;

    if (!appointment_id || typeof appointment_id !== "string") {
      return new Response(
        JSON.stringify({ error: "appointment_id ist erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedDelay = Number(delay_minutes);
    if (isNaN(parsedDelay)) {
      return new Response(
        JSON.stringify({ error: "delay_minutes muss eine Zahl sein" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action_type === "on_my_way") {
      if (parsedDelay < 0 || parsedDelay > 180) {
        return new Response(
          JSON.stringify({ error: "Geschätzte Zeit muss zwischen 0 und 180 Minuten liegen" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      if (parsedDelay < 1 || parsedDelay > 180) {
        return new Response(
          JSON.stringify({ error: "Verspätung muss zwischen 1 und 180 Minuten liegen" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const cleanNote = sanitizeText(note);
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // B. Load valid appointment
    const { data: appointment, error: apptError } = await adminSupabase
      .from("appointments")
      .select("id, date, time, status, client_id, provider_id, assigned_to_user_id, horse_id")
      .eq("id", appointment_id)
      .maybeSingle();

    if (apptError || !appointment) {
      return new Response(
        JSON.stringify({ error: "Termin nicht gefunden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (appointment.status === "cancelled" || appointment.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Termin ist bereits abgesagt oder abgeschlossen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // C. Appointment must have a horse_id
    if (!appointment.horse_id) {
      return new Response(
        JSON.stringify({ error: "Termin ist keinem gültigen Pferd zugewiesen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // D. Referenced horse exists & E. Appointment client is legitimate owner
    const { data: horse, error: horseError } = await adminSupabase
      .from("horses")
      .select("id, name, owner_id")
      .eq("id", appointment.horse_id)
      .maybeSingle();

    if (horseError || !horse) {
      return new Response(
        JSON.stringify({ error: "Zugeordnetes Pferd nicht gefunden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!appointment.client_id || horse.owner_id !== appointment.client_id) {
      return new Response(
        JSON.stringify({ error: "Ungültige Kunden-Pferde-Besitzerzuordnung für diesen Termin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // F. Sender and recipient are actual parties of the appointment
    const professionalId = appointment.assigned_to_user_id || appointment.provider_id;
    const isClient = senderId === appointment.client_id;
    const isProfessional = senderId === appointment.provider_id || senderId === appointment.assigned_to_user_id;

    if (!isClient && !isProfessional) {
      return new Response(
        JSON.stringify({ error: "Sie sind kein gewählter Teilnehmer dieses Termins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientId = isClient ? professionalId : appointment.client_id;
    if (!recipientId || recipientId === senderId) {
      return new Response(
        JSON.stringify({ error: "Empfänger konnte für diesen Termin nicht ermittelt werden" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // G. Verify active relationship exists between client and professional
    const nowIso = new Date().toISOString();

    // Check 1: Provider access_grants (#PID <-> #KID)
    const { data: activeGrant } = await adminSupabase
      .from("access_grants")
      .select("id, status, is_active, valid_until, revoked_at")
      .eq("client_id", appointment.client_id)
      .eq("provider_id", professionalId)
      .eq("status", "active")
      .eq("is_active", true)
      .is("revoked_at", null)
      .or(`valid_until.is.null,valid_until.gt.${nowIso}`)
      .maybeSingle();

    let hasAuthorizedRelationship = !!activeGrant;

    if (!hasAuthorizedRelationship) {
      // Check 2: Partner horse_partner_access (#EQID <-> #PRID)
      const { data: activePartnerAccess } = await adminSupabase
        .from("horse_partner_access")
        .select("id, status, is_active, valid_until, revoked_at")
        .eq("horse_id", appointment.horse_id)
        .eq("partner_profile_id", professionalId)
        .in("status", ["active", "accepted"])
        .eq("is_active", true)
        .is("revoked_at", null)
        .or(`valid_until.is.null,valid_until.gt.${nowIso}`)
        .maybeSingle();

      if (activePartnerAccess) {
        hasAuthorizedRelationship = true;
      }
    }

    if (!hasAuthorizedRelationship) {
      return new Response(
        JSON.stringify({ error: "Keine aktive, freigegebene Beziehung für diesen Termin und dieses Pferd vorhanden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format notification
    const horseName = horse.name;
    let notifTitle = "";
    let notifBody = "";
    let notifType = "appointment_delay";
    let notifLink = "/client-home";
    const estimatedArrival = calculateNewArrival(appointment.time, parsedDelay);

    if (isProfessional) {
      // Professional -> Client
      let displayName = "Dein Pferdeprofi";

      const { data: profProfile } = await adminSupabase
        .from("profiles")
        .select("full_name")
        .eq("id", senderId)
        .maybeSingle();

      if (profProfile?.full_name) {
        displayName = profProfile.full_name;
      } else {
        const { data: bs } = await adminSupabase
          .from("business_settings")
          .select("business_name")
          .eq("user_id", senderId)
          .maybeSingle();
        if (bs?.business_name) {
          displayName = bs.business_name;
        }
      }

      if (action_type === "on_my_way") {
        notifTitle = `🚗 ${displayName} ist unterwegs!`;
        const etaStr = parsedDelay > 0 ? `ca. ${parsedDelay} Min.` : "in Kürze";
        notifBody = `${displayName} ist auf dem Weg${horseName ? ` zu ${horseName}` : ""}. Geschätzte Ankunft: ${etaStr}. Bitte Pferd bereitstellen.`;
        if (cleanNote) notifBody += ` Info: "${cleanNote}"`;
        notifType = "on_my_way";
      } else {
        notifTitle = "Termin verschiebt sich";
        notifBody = `${displayName} kommt voraussichtlich ca. ${parsedDelay} Minuten später.`;
        if (estimatedArrival) {
          notifBody += ` Neue Ankunft: ca. ${estimatedArrival} Uhr.`;
        }
        if (horseName) {
          notifBody += ` Termin für ${horseName}.`;
        }
        if (cleanNote) {
          notifBody += ` Info: "${cleanNote}"`;
        }
        notifType = "appointment_delay";
      }
      notifLink = "/client-home";
    } else {
      // Client -> Professional
      let clientName = "Kunde";
      const { data: clientProfile } = await adminSupabase
        .from("profiles")
        .select("full_name")
        .eq("id", senderId)
        .maybeSingle();

      if (clientProfile?.full_name) {
        clientName = clientProfile.full_name;
      }

      notifTitle = "Kunde verspätet sich";
      notifBody = `${clientName} meldet ca. ${parsedDelay} Minuten Verspätung`;
      if (horseName) {
        notifBody += ` für den Termin mit ${horseName}.`;
      } else {
        notifBody += `.`;
      }
      if (cleanNote) {
        notifBody += ` Nachricht: "${cleanNote}"`;
      }
      notifType = "appointment_delay";
      notifLink = "/calendar";
    }

    // Insert in-app notification using service role
    const { error: notifInsertError } = await adminSupabase
      .from("notifications")
      .insert({
        user_id: recipientId,
        title: notifTitle,
        message: notifBody,
        type: notifType,
        link: notifLink,
      });

    if (notifInsertError) {
      console.error("Error inserting notification:", notifInsertError);
      return new Response(
        JSON.stringify({ error: "Benachrichtigung konnte nicht gespeichert werden" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push notification if recipient has push subscriptions
    try {
      const { data: subscriptions } = await adminSupabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", recipientId);

      if (subscriptions && subscriptions.length > 0) {
        const pushUrl = `${supabaseUrl}/functions/v1/send-push-notification`;
        await fetch(pushUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_id: recipientId,
            title: notifTitle,
            body: notifBody,
            url: notifLink,
          }),
        });
      }
    } catch (pushErr) {
      console.error("Push dispatch warning (non-fatal):", pushErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipient_id: recipientId,
        delay_minutes: parsedDelay,
        estimated_arrival: estimatedArrival,
        title: notifTitle,
        message: notifBody,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error in notify-appointment-delay:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interner Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
