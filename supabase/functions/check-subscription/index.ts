import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify Clerk JWT token and return user ID
function verifyClerkToken(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub || payload.user_id;
    
    if (!userId) {
      throw new Error('Invalid token - no user ID');
    }
    
    // Check token expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }
    
    return userId;
  } catch (error) {
    console.error('[CHECK-SUBSCRIPTION] Auth failed:', error);
    throw new Error('Unauthorized');
  }
}

// Input validation
function validateInput(userEmail: any, userId: any): { valid: boolean; error?: string } {
  if (!userEmail || typeof userEmail !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  if (userEmail.length > 255) {
    return { valid: false, error: 'Email too long (max 255 chars)' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (!userId || typeof userId !== 'string') {
    return { valid: false, error: 'User ID is required' };
  }
  if (userId.length > 100) {
    return { valid: false, error: 'User ID too long' };
  }
  
  return { valid: true };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

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

    // Verify authentication FIRST
    const authHeader = req.headers.get('Authorization');
    let tokenUserId: string;
    
    try {
      tokenUserId = verifyClerkToken(authHeader);
      logStep("User authenticated from token", { tokenUserId });
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

    const { userEmail, userId } = await req.json();
    
    // Validate input
    const validation = validateInput(userEmail, userId);
    if (!validation.valid) {
      logStep("Validation failed", { error: validation.error });
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Verify the userId from request matches the token
    if (userId !== tokenUserId) {
      logStep("User ID mismatch", { requestUserId: userId, tokenUserId });
      return new Response(
        JSON.stringify({ error: "User ID mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    logStep("Request data", { email: userEmail, userId });

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

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    
    const eligibleSub = subscriptions.data.find((sub: any) => 
      sub.status === 'active' || sub.status === 'trialing'
    );
    
    if (eligibleSub) {
      logStep("Eligible subscription found", { 
        subscriptionId: eligibleSub.id, 
        status: eligibleSub.status 
      });
      
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
      }
      
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
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
