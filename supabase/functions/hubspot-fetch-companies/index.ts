// Follow Deno Edge Function conventions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get the current user from the request
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const hubspotClientId = Deno.env.get("HUBSPOT_CLIENT_ID");
    const hubspotClientSecret = Deno.env.get("HUBSPOT_CLIENT_SECRET");
    
    // Validate all required environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    if (!hubspotClientId || !hubspotClientSecret) {
      throw new Error("Missing HubSpot environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user ID from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Get the HubSpot integration settings for the user
    const { data: integrationSettings, error: settingsError } = await supabase
      .from("integration_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("integration_type", "hubspot")
      .single();

    if (settingsError) {
      throw new Error(`Failed to fetch integration settings: ${settingsError.message}`);
    }

    if (!integrationSettings) {
      throw new Error("HubSpot integration not found. Please reconnect to HubSpot.");
    }

    if (!integrationSettings.access_token) {
      throw new Error("HubSpot access token not found. Please reconnect to HubSpot.");
    }

    // Check if the token is expired and refresh if needed
    const now = new Date();
    const tokenExpiresAt = integrationSettings.token_expires_at ? new Date(integrationSettings.token_expires_at) : null;
    
    let accessToken = integrationSettings.access_token;
    
    if (tokenExpiresAt && tokenExpiresAt <= now && integrationSettings.refresh_token) {
      console.log("Token expired, refreshing...");
      
      try {
        // Refresh the token
        const refreshResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: hubspotClientId,
            client_secret: hubspotClientSecret,
            refresh_token: integrationSettings.refresh_token,
          }),
        });

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text();
          throw new Error(`Token refresh failed: ${errorText}`);
        }

        const refreshData = await refreshResponse.json();
        
        // Update the tokens in the database
        const { error: updateError } = await supabase
          .from("integration_settings")
          .update({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          })
          .eq("id", integrationSettings.id);

        if (updateError) {
          throw new Error(`Failed to update tokens: ${updateError.message}`);
        }
        
        accessToken = refreshData.access_token;
        console.log("Token refreshed successfully");
      } catch (refreshError) {
        console.error("Token refresh error:", refreshError);
        throw new Error(`Failed to refresh HubSpot token: ${refreshError.message}`);
      }
    }

    // Fetch companies from HubSpot
    console.log("Fetching companies from HubSpot...");
    const limit = 100; // Maximum number of companies to fetch per request
    const companiesResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/companies?limit=${limit}&properties=name,domain,industry,annualrevenue,numberofemployees,city,country,hs_created_date,hs_lastmodifieddate`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!companiesResponse.ok) {
      const errorText = await companiesResponse.text();
      throw new Error(`Failed to fetch companies: ${companiesResponse.status} - ${errorText}`);
    }

    const companiesData = await companiesResponse.json();
    
    if (!companiesData.results) {
      throw new Error("Invalid response from HubSpot API");
    }
    
    console.log(`Found ${companiesData.results.length} companies`);
    
    // Process and store the companies
    const companies = companiesData.results.map((company: any) => ({
      user_id: user.id,
      hubspot_id: company.id,
      name: company.properties.name,
      domain: company.properties.domain,
      industry: company.properties.industry,
      annual_revenue: company.properties.annualrevenue ? parseFloat(company.properties.annualrevenue) : null,
      size: company.properties.numberofemployees,
      location: company.properties.city && company.properties.country 
        ? `${company.properties.city}, ${company.properties.country}`
        : company.properties.city || company.properties.country || null,
      created_date: company.properties.hs_created_date ? new Date(company.properties.hs_created_date).toISOString() : null,
      last_modified_date: company.properties.hs_lastmodifieddate ? new Date(company.properties.hs_lastmodifieddate).toISOString() : null,
      properties: company.properties,
    }));

    // Store the companies in the database
    const { error: insertError } = await supabase
      .from("company_data")
      .upsert(companies, { onConflict: "user_id,hubspot_id" });

    if (insertError) {
      throw new Error(`Failed to store companies: ${insertError.message}`);
    }

    console.log(`Successfully stored ${companies.length} companies`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully fetched and stored ${companies.length} companies`,
        count: companies.length,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in hubspot-fetch-companies:", error);
    
    // Return detailed error response
    return new Response(
      JSON.stringify({ 
        error: true,
        message: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});