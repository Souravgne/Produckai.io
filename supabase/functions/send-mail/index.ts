import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey"
      }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (_) {
    return new Response(JSON.stringify({
      error: "Invalid or malformed JSON body"
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  const { to, subject, html, text } = body;

  // Validate required fields
  if (!to || !subject || !html) {
    return new Response(JSON.stringify({
      error: "Missing required fields: 'to', 'subject', and 'html' are required"
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // Mailgun credentials
  const apiKey = Deno.env.get("MAILGUN_API_KEY");
  const domain = Deno.env.get("MAILGUN_DOMAIN_PRODUCTAI");

  if (!apiKey || !domain) {
    return new Response(JSON.stringify({
      error: "Missing Mailgun environment variables"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  const form = new URLSearchParams();
  form.append("from", `ProduckAI Notifications <postmaster@${domain}>`);
  form.append("to", to);
  form.append("subject", subject);
  form.append("html", html);
  if (text) form.append("text", text); // optional plain text fallback

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`api:${apiKey}`),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (!response.ok) {
    console.error("Mailgun Error:", data);
    return new Response(JSON.stringify({ error: data }), {
      status: response.status,
      headers
    });
  }

  console.log("Email sent successfully");
  return new Response(JSON.stringify({
    message: "Email sent successfully",
    data
  }), {
    status: 200,
    headers
  });
});
