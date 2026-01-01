import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createClerkClient } from "https://esm.sh/@clerk/backend@1.15.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLERK_JWKS_URL = "https://clerk.sparkboard.eu/.well-known/jwks.json";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

async function verifyClerkToken(authHeader: string | null): Promise<string> {
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.replace('Bearer ', '');
  const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");

  if (!clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY not configured");
  }

  logStep("Verifying JWT with JWKS");

  try {
    const clerk = createClerkClient({
      secretKey: clerkSecretKey,
      jwtKey: CLERK_JWKS_URL
    });

    const verifiedToken = await clerk.verifyToken(token, {
      jwtKey: CLERK_JWKS_URL
    });

    logStep("JWT verified successfully", { userId: verifiedToken.sub });
    return verifiedToken.sub;
  } catch (error) {
    logStep("JWT verification failed", { error: error.message });
    throw new Error("Invalid or expired token");
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
    
    logStep("Request data", { priceId, email: userEmail });

    logStep("Creating checkout session", { priceId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-12-18.acacia"
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
