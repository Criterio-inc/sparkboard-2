import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * INTERNAL-ONLY EMAIL SENDING FUNCTION
 *
 * SECURITY: This function should ONLY be called by other edge functions.
 * It accepts an internal API key to prevent public access and abuse.
 *
 * To call from another edge function:
 * const INTERNAL_API_KEY = Deno.env.get("INTERNAL_API_KEY");
 * await supabase.functions.invoke("send-email", {
 *   headers: { "x-internal-key": INTERNAL_API_KEY },
 *   body: { to, subject, html, from }
 * });
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

async function verifyInternalAccess(req: Request): Promise<boolean> {
  // Check for internal API key
  const internalKey = req.headers.get("x-internal-key");
  const expectedKey = Deno.env.get("INTERNAL_API_KEY");

  if (!expectedKey) {
    console.warn("[SEND-EMAIL] INTERNAL_API_KEY not configured - function is INSECURE!");
    // In development, allow without key (but log warning)
    // In production, this should be required
    return Deno.env.get("ENVIRONMENT") === "development";
  }

  return internalKey === expectedKey;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY CHECK: Verify internal access
    const hasInternalAccess = await verifyInternalAccess(req);

    if (!hasInternalAccess) {
      console.error("[SEND-EMAIL] Unauthorized access attempt blocked");
      return new Response(
        JSON.stringify({
          error: "Unauthorized. This is an internal-only function."
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { to, subject, html, from = "Sparkboard <no-reply@send.sparkboard.eu>" }: EmailRequest = await req.json();

    // Basic validation
    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error("Invalid email address");
    }

    console.log("[SEND-EMAIL] Sending email to:", to, "Subject:", subject);

    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[SEND-EMAIL] Resend API error:", error);
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    console.log("[SEND-EMAIL] Email sent successfully:", data.id);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SEND-EMAIL] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
