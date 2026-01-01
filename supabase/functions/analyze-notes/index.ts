import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createClerkClient } from "https://esm.sh/@clerk/backend@1.15.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLERK_JWKS_URL = "https://clerk.sparkboard.eu/.well-known/jwks.json";

async function verifyClerkToken(authHeader: string | null): Promise<string> {
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.replace('Bearer ', '');
  const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");

  if (!clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY not configured");
  }

  console.log("[ANALYZE-NOTES] Verifying JWT with JWKS");

  try {
    const clerk = createClerkClient({
      secretKey: clerkSecretKey,
      jwtKey: CLERK_JWKS_URL
    });

    const verifiedToken = await clerk.verifyToken(token, {
      jwtKey: CLERK_JWKS_URL
    });

    console.log("[ANALYZE-NOTES] JWT verified successfully", { userId: verifiedToken.sub });
    return verifiedToken.sub;
  } catch (error) {
    console.error("[ANALYZE-NOTES] JWT verification failed:", error.message);
    throw new Error("Invalid or expired token");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL: Verify JWT first
    const userId = await verifyClerkToken(req.headers.get("authorization"));
    console.log("[ANALYZE-NOTES] User authenticated", { userId });

    // Check user's plan - AI analysis requires Pro or Curago
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("[ANALYZE-NOTES] Error fetching profile:", profileError);
      throw new Error("Could not verify user plan");
    }

    const userPlan = profile?.plan || 'free';
    console.log("[ANALYZE-NOTES] User plan:", userPlan);

    if (userPlan !== 'pro' && userPlan !== 'curago') {
      console.log("[ANALYZE-NOTES] Access denied - plan not eligible", { plan: userPlan });
      return new Response(
        JSON.stringify({
          error: "AI_REQUIRES_PRO",
          message: "AI-analys kräver Sparkboard Pro. Uppgradera ditt konto för att använda denna funktion.",
          userPlan,
          requiredPlan: "pro eller curago"
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // User is authorized - proceed with AI analysis
    const { notes, customPrompt } = await req.json();

    console.log("[ANALYZE-NOTES] Received analysis request for", notes.length, "notes");
    console.log("[ANALYZE-NOTES] Custom prompt provided:", !!customPrompt);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Format notes for AI context
    const notesContext = notes
      .map((note: any, index: number) =>
        `Note ${index + 1} (Question: ${note.question}):\n${note.content}`
      )
      .join("\n\n");

    // System prompt that ensures good Markdown formatting
    const systemPrompt = `Du är en expert på att analysera workshop-resultat.

KRITISKT: Formatera ALLTID ditt svar med Markdown:
- Använd ## för huvudrubriker
- Använd ### för underrubriker
- Använd - eller • för punktlistor
- Använd **fetstil** för viktiga koncept
- Lämna en tom rad mellan stycken
- Strukturera tydligt med sektioner

Skriv på samma språk som användarens prompt.`;

    // Use the custom prompt directly - no fallback
    if (!customPrompt) {
      throw new Error("Custom prompt is required");
    }

    const fullPrompt = `${customPrompt}\n\n--- WORKSHOP NOTES ---\n${notesContext}`;

    console.log("[ANALYZE-NOTES] Calling AI with prompt length:", fullPrompt.length);
    console.log("[ANALYZE-NOTES] User prompt preview:", customPrompt.substring(0, 100) + "...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ANALYZE-NOTES] AI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit nådd. Försök igen om en stund." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-krediter slut. Kontakta administratören." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log("[ANALYZE-NOTES] Analysis generated successfully, length:", analysis.length);

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ANALYZE-NOTES] Error in analyze-notes function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const status = errorMessage.includes("Authorization") ||
                   errorMessage.includes("token") ||
                   errorMessage.includes("Invalid") ? 401 : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
