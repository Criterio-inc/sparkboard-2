import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clerk JWKS endpoint for cryptographic verification
const CLERK_JWKS_URL = "https://api.clerk.dev/v1/jwks";
const JWKS = createRemoteJWKSet(new URL(CLERK_JWKS_URL));

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
    
    console.log('[CUSTOMER-PORTAL] Token cryptographically verified for user:', payload.sub);
    return payload.sub;
  } catch (error) {
    console.error('[CUSTOMER-PORTAL] Token verification failed:', error);
    throw new Error('Unauthorized - token verification failed');
  }
}

// Input validation
function validateInput(userEmail: any): { valid: boolean; error?: string } {
  if (!userEmail || typeof userEmail !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  if (userEmail.length > 255) {
    return { valid: false, error: 'Email too long (max 255 chars)' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify authentication FIRST
    const authHeader = req.headers.get('Authorization');
    let userId: string;
    
    try {
      userId = await verifyClerkToken(authHeader);
      logStep("User authenticated", { userId });
    } catch (authError) {
      logStep("Authentication failed", { error: String(authError) });
      return new Response(
        JSON.stringify({ error: "Unauthorized - please log in" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const { userEmail } = await req.json();
    
    // Validate input
    const validation = validateInput(userEmail);
    if (!validation.valid) {
      logStep("Validation failed", { error: validation.error });
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    logStep("Request data", { email: userEmail, userId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }
    
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });
    
    logStep("Customer portal session created", { sessionId: portalSession.id });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
