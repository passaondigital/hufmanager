import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      vaccinations_due: 0,
      dewormings_due: 0,
      access_expiring: 0,
      transfers_expiring: 0,
      errors: [] as string[],
    };

    // ── A: Vaccinations due in 7 days ──
    try {
      const { data: vaccinations } = await supabase
        .from("horse_vaccinations")
        .select("id, vaccine_type, next_due_date, horse_id")
        .gte("next_due_date", new Date().toISOString().split("T")[0])
        .lte(
          "next_due_date",
          new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
        );

      if (vaccinations && vaccinations.length > 0) {
        for (const v of vaccinations) {
          const { data: horse } = await supabase
            .from("horses")
            .select("name, owner_id")
            .eq("id", v.horse_id)
            .is("deleted_at", null)
            .maybeSingle();

          if (horse?.owner_id) {
            // Check idempotency: don't send duplicate within 24h
            const { count } = await supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", horse.owner_id)
              .eq("type", "vaccination_due")
              .gte(
                "created_at",
                new Date(Date.now() - 86400000).toISOString()
              )
              .ilike("message", `%${v.vaccine_type}%`)
              .ilike("message", `%${horse.name}%`);

            if (!count || count === 0) {
              await supabase.from("notifications").insert({
                user_id: horse.owner_id,
                title: "⚠️ Impfung fällig",
                message: `Die ${v.vaccine_type}-Impfung von ${horse.name} ist in 7 Tagen fällig.`,
                type: "vaccination_due",
                link: `/client-horse/${v.horse_id}`,
              });
              results.vaccinations_due++;
            }
          }
        }
      }
    } catch (e) {
      results.errors.push(`vaccinations: ${e.message}`);
    }

    // ── B: Dewormings due in 7 days ──
    try {
      const { data: dewormings } = await supabase
        .from("horse_deworming")
        .select("id, product_name, next_due_date, horse_id")
        .gte("next_due_date", new Date().toISOString().split("T")[0])
        .lte(
          "next_due_date",
          new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
        );

      if (dewormings && dewormings.length > 0) {
        for (const d of dewormings) {
          const { data: horse } = await supabase
            .from("horses")
            .select("name, owner_id")
            .eq("id", d.horse_id)
            .is("deleted_at", null)
            .maybeSingle();

          if (horse?.owner_id) {
            const { count } = await supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", horse.owner_id)
              .eq("type", "deworming_due")
              .gte(
                "created_at",
                new Date(Date.now() - 86400000).toISOString()
              )
              .ilike("message", `%${horse.name}%`);

            if (!count || count === 0) {
              await supabase.from("notifications").insert({
                user_id: horse.owner_id,
                title: "⚠️ Entwurmung fällig",
                message: `Die Entwurmung von ${horse.name} ist in 7 Tagen fällig.`,
                type: "deworming_due",
                link: `/client-horse/${d.horse_id}`,
              });
              results.dewormings_due++;
            }
          }
        }
      }
    } catch (e) {
      results.errors.push(`dewormings: ${e.message}`);
    }

    // ── C: Expiring access rights (3 days) ──
    try {
      const { data: expiring } = await supabase
        .from("horse_partner_access")
        .select("id, horse_id, partner_name, valid_until")
        .gte("valid_until", new Date().toISOString().split("T")[0])
        .lte(
          "valid_until",
          new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]
        )
        .is("revoked_at", null);

      if (expiring && expiring.length > 0) {
        for (const a of expiring) {
          const { data: horse } = await supabase
            .from("horses")
            .select("name, owner_id")
            .eq("id", a.horse_id)
            .is("deleted_at", null)
            .maybeSingle();

          if (horse?.owner_id) {
            const { count } = await supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", horse.owner_id)
              .eq("type", "horse_access_expiring")
              .gte(
                "created_at",
                new Date(Date.now() - 86400000).toISOString()
              );

            if (!count || count === 0) {
              await supabase.from("notifications").insert({
                user_id: horse.owner_id,
                title: "⏰ Zugriff läuft bald ab",
                message: `Der Zugriff von ${a.partner_name || "einem Partner"} auf ${horse.name} läuft in 3 Tagen ab.`,
                type: "horse_access_expiring",
                link: `/client-horse/${a.horse_id}`,
              });
              results.access_expiring++;
            }
          }
        }
      }
    } catch (e) {
      results.errors.push(`access_expiring: ${e.message}`);
    }

    // ── D: Expiring transfers (3 days) ──
    try {
      const { data: transfers } = await supabase
        .from("horse_transfers")
        .select("id, horse_id, seller_id, expires_at, status")
        .gte("expires_at", new Date().toISOString())
        .lte(
          "expires_at",
          new Date(Date.now() + 3 * 86400000).toISOString()
        )
        .not("status", "in", '("completed","cancelled")');

      if (transfers && transfers.length > 0) {
        for (const t of transfers) {
          const { data: horse } = await supabase
            .from("horses")
            .select("name")
            .eq("id", t.horse_id)
            .maybeSingle();

          if (t.seller_id) {
            const { count } = await supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", t.seller_id)
              .eq("type", "horse_transfer_expiring")
              .gte(
                "created_at",
                new Date(Date.now() - 86400000).toISOString()
              );

            if (!count || count === 0) {
              await supabase.from("notifications").insert({
                user_id: t.seller_id,
                title: "⏰ Transfer läuft ab",
                message: `Der Transfer von ${horse?.name || "einem Pferd"} läuft in 3 Tagen ab.`,
                type: "horse_transfer_expiring",
              });
              results.transfers_expiring++;
            }
          }
        }
      }
    } catch (e) {
      results.errors.push(`transfers: ${e.message}`);
    }

    console.log("notification-scheduler results:", results);

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notification-scheduler error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
