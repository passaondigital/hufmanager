import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[publish-scheduled-posts] Starting scheduled post check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: require service_role bearer token OR valid admin user token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // If not service role key, verify caller is an admin
    if (token !== supabaseServiceKey) {
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const adminCheck = createClient(supabaseUrl, supabaseServiceKey);
      const { data: isAdmin } = await adminCheck.rpc("is_admin", { _user_id: claimsData.claims.sub });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden - admin only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all posts that are scheduled and the scheduled time has passed
    const now = new Date().toISOString();
    
    const { data: postsToPublish, error: fetchError } = await supabase
      .from("blog_posts")
      .select("id, title, slug, scheduled_at")
      .eq("is_published", false)
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", now);

    if (fetchError) {
      console.error("[publish-scheduled-posts] Error fetching posts:", fetchError);
      throw fetchError;
    }

    console.log(`[publish-scheduled-posts] Found ${postsToPublish?.length || 0} posts to publish`);

    if (!postsToPublish || postsToPublish.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No posts to publish", published_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const publishedPosts: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const post of postsToPublish) {
      console.log(`[publish-scheduled-posts] Publishing post: ${post.title} (${post.id})`);

      const { error: updateError } = await supabase
        .from("blog_posts")
        .update({
          is_published: true,
          published_at: post.scheduled_at,
          scheduled_at: null,
        })
        .eq("id", post.id);

      if (updateError) {
        console.error(`[publish-scheduled-posts] Error publishing post ${post.id}:`, updateError);
        errors.push({ id: post.id, error: updateError.message });
      } else {
        publishedPosts.push(post.title);
        console.log(`[publish-scheduled-posts] Successfully published: ${post.title}`);
      }
    }

    const response = {
      success: true,
      message: `Published ${publishedPosts.length} posts`,
      published_count: publishedPosts.length,
      published_titles: publishedPosts,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("[publish-scheduled-posts] Completed:", response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("[publish-scheduled-posts] Fatal error:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
