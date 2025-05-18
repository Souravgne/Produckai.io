import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const HUBSPOT_CLIENT_ID = Deno.env.get("HUBSPOT_CLIENT_ID") || "";
const HUBSPOT_CLIENT_SECRET = Deno.env.get("HUBSPOT_CLIENT_SECRET") || "";
const REDIRECT_URI = Deno.env.get("HUBSPOT_REDIRECT_URI") || "";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) throw new Error(`HubSpot Error: ${error}`);
    if (!code || !state) throw new Error("Missing code or state");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const tokenRes = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.message || "Token exchange failed");

    const accountRes = await fetch("https://api.hubapi.com/integrations/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const accountData = await accountRes.json();
    if (!accountRes.ok) throw new Error("HubSpot account fetch failed");

    const { error: upsertError } = await supabase.from("integration_settings").upsert({
      user_id: state,
      integration_type: "hubspot",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      workspace_id: accountData.hub_id?.toString() || null,
      additional_settings: {
        hub_domain: accountData.hub_domain,
        account_name: accountData.hub_name,
        scopes: tokenData.scope?.split(" "),
        connected_at: new Date().toISOString(),
      },
    });

    if (upsertError) throw new Error(upsertError.message);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: `${FRONTEND_URL}/dashboard/data-sources/integrations?integration=hubspot&status=success`,
      },
    });
  } catch (e) {
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: `${FRONTEND_URL}/dashboard/data-sources/integrations?integration=hubspot&status=error&message=${encodeURIComponent(e.message)}`,
      },
    });
  }
});
