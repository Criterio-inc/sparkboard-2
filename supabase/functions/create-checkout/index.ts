import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clerk JWKS endpoint for cryptographic verification (instance-specific)
const CLERK_JWKS_URL = "https://clerk.sparkboard.eu/.well-known/jwks.json";
const JWKS = createRemoteJWKSet(new URL(CLERK_JWKS_URL));

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// KRITISKT: Kryptografisk JWT-verifiering med JWKS
async function verifyClerkToken(authHeader: string | null): Promise<string> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // KRYPTOGRAFISK SIGNATURVERIFIERING med JWKS
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ['RS256'],
    });
    
    if (!payload.sub) {
      throw new Error('Invalid token - no user ID');
    }
    
    logStep("JWT verified successfully", { userId: payload.sub });
    return payload.sub;
  } catch (error) {
    console.error('[CREATE-CHECKOUT] Token verification failed:', error);
    throw new Error('Unauthorized - token verification failed');
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify JWT and get user ID
    const userId = await verifyClerkToken(req.headers.get("authorization"));
    logStep("User authenticated", { userId });

    // Get user's email from verified profile (NOT from request body)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      logStep("Error fetching profile", { error: profileError });
      throw new Error("User profile not found");
    }

    const userEmail = profile.email;
    logStep("Using verified email from profile", { email: userEmail });

    const { priceId } = await req.json();

    if (!priceId) throw new Error("Price ID is required");
    if (!userEmail) throw new Error("User email is required");

    // Validate priceId
    if (typeof priceId !== 'string' || priceId.length > 100) {
      throw new Error("Invalid price ID");
    }

    logStep("Request data", { priceId, email: userEmail });

    logStep("Creating checkout session", { priceId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil"
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      logStep("No existing customer found");
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/payment-success`,
      cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    const status = errorMessage.includes("Authorization") ||
                   errorMessage.includes("token") ||
                   errorMessage.includes("Invalid") ? 401 : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
