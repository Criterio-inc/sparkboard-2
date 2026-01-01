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
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // SECURITY FIX: Verify JWT token first
    const userId = await verifyClerkToken(req.headers.get("authorization"));
    logStep("User authenticated", { userId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Get user's email from verified profile (not from request body for security)
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

    // Check if user has @curago.se domain - they get automatic executive-PRO access
    const isCuragoEmail = userEmail.toLowerCase().endsWith('@curago.se');
    if (isCuragoEmail) {
      logStep("Curago executive email detected, granting executive-PRO access");

      const { error: upsertError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: userId,
          email: userEmail,
          plan: 'curago',
          plan_source: 'curago_domain',
          subscription_current_period_end: null,
          stripe_customer_id: null,
          stripe_subscription_id: null
        }, { onConflict: 'id' });

      if (upsertError) {
        logStep("Error upserting Curago profile", { error: upsertError.message });
        return new Response(JSON.stringify({
          error: upsertError.message,
          subscribed: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      logStep("Curago executive profile upserted successfully");

      return new Response(JSON.stringify({
        subscribed: true,
        plan: 'curago',
        plan_source: 'curago_domain'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");

      // Update user profile to free
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          plan: 'free',
          plan_source: null
        })
        .eq('id', userId);

      if (updateError) {
        logStep("Error updating profile", { error: updateError.message });
      } else {
        logStep("Profile updated to free");
      }

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // List all subscriptions (not just active) and filter for eligible ones
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    // Find first subscription that's active or trialing
    const eligibleSub = subscriptions.data.find((sub: any) =>
      sub.status === 'active' || sub.status === 'trialing'
    );

    if (eligibleSub) {
      logStep("Eligible subscription found", {
        subscriptionId: eligibleSub.id,
        status: eligibleSub.status
      });

      // Safely get end date - use current_period_end or trial_end, validate it exists
      const endSeconds = eligibleSub.current_period_end ?? eligibleSub.trial_end;
      let subscriptionEnd: string | null = null;

      if (endSeconds && typeof endSeconds === 'number' && endSeconds > 0) {
        try {
          const subscriptionEndTimestamp = endSeconds * 1000;
          subscriptionEnd = new Date(subscriptionEndTimestamp).toISOString();
          logStep("Subscription end date calculated", {
            endSeconds,
            timestamp: subscriptionEndTimestamp,
            isoDate: subscriptionEnd
          });
        } catch (dateError) {
          logStep("Warning: Could not parse end date", { endSeconds, error: String(dateError) });
        }
      } else {
        logStep("Warning: No valid end date found", {
          current_period_end: eligibleSub.current_period_end,
          trial_end: eligibleSub.trial_end
        });
      }

      // Use upsert to ensure profile exists and is updated
      const profileData = {
        id: userId,
        email: userEmail,
        plan: 'pro',
        plan_source: 'stripe',
        subscription_current_period_end: subscriptionEnd,
        stripe_customer_id: customerId,
        stripe_subscription_id: eligibleSub.id
      };

      const { error: upsertError } = await supabaseClient
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (upsertError) {
        logStep("Error upserting profile to pro", { error: upsertError.message });
      } else {
        logStep("Profile upserted to pro successfully");
      }

      return new Response(JSON.stringify({
        subscribed: true,
        subscription_end: subscriptionEnd
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      logStep("No eligible subscription found", {
        totalSubscriptions: subscriptions.data.length,
        statuses: subscriptions.data.map((s: any) => s.status)
      });

      // Use upsert to set profile to free
      const profileData = {
        id: userId,
        email: userEmail,
        plan: 'free',
        plan_source: null,
        subscription_current_period_end: null,
        stripe_customer_id: customerId,
        stripe_subscription_id: null
      };

      const { error: upsertError } = await supabaseClient
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (upsertError) {
        logStep("Error upserting profile to free", { error: upsertError.message });
      } else {
        logStep("Profile upserted to free successfully");
      }

      return new Response(JSON.stringify({
        subscribed: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });

    const status = errorMessage.includes("Authorization") ||
                   errorMessage.includes("token") ||
                   errorMessage.includes("Invalid") ? 401 : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
